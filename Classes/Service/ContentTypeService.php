<?php

declare(strict_types=1);

namespace FriendsOfTYPO3\ContentBlocksGui\Service;

use FriendsOfTYPO3\ContentBlocksGui\Answer\AnswerInterface;
use FriendsOfTYPO3\ContentBlocksGui\Answer\DataAnswer;
use FriendsOfTYPO3\ContentBlocksGui\Utility\DatabaseUtility;
use Symfony\Component\Yaml\Yaml;
use TYPO3\CMS\ContentBlocks\Builder\ConfigBuilder;
use TYPO3\CMS\ContentBlocks\Builder\ContentBlockBuilder;
use TYPO3\CMS\ContentBlocks\Builder\DefaultsLoader;
use TYPO3\CMS\ContentBlocks\Definition\ContentType\ContentType;
use TYPO3\CMS\ContentBlocks\Definition\ContentType\ContentTypeIcon;
use TYPO3\CMS\ContentBlocks\Generator\LanguageFileGenerator;
use TYPO3\CMS\ContentBlocks\Loader\ContentBlockLoader;
use TYPO3\CMS\ContentBlocks\Loader\LoadedContentBlock;
use TYPO3\CMS\ContentBlocks\Registry\ContentBlockRegistry;
use TYPO3\CMS\ContentBlocks\Service\PackageResolver;
use TYPO3\CMS\ContentBlocks\Utility\ContentBlockPathUtility;
use TYPO3\CMS\ContentBlocks\Validation\ContentBlockNameValidator;
use TYPO3\CMS\ContentBlocks\Validation\PageTypeNameValidator;
use TYPO3\CMS\Core\Cache\CacheManager;
use TYPO3\CMS\Core\Utility\GeneralUtility;

class ContentTypeService
{
    use FieldCleanupTrait;

    public function __construct(
        protected readonly ContentBlockRegistry $contentBlockRegistry,
        protected readonly PackageResolver $packageResolver,
        protected readonly ContentBlockBuilder $contentBlockBuilder,
        protected readonly ContentBlockLoader $contentBlockLoader,
        protected readonly ConfigBuilder $configBuilder,
        protected readonly DefaultsLoader $defaultsLoader,
        protected readonly CacheManager $cacheManager,
        protected readonly LanguageFileGenerator $languageFileGenerator,
        protected readonly DatabaseUtility $databaseUtility,
    ) {}

    public function getContentTypeData(array $contentBlockData): array
    {
        // Validate vendor and name using EXT:content_blocks validators
        $vendor = $contentBlockData['vendor'];
        $name = $contentBlockData['name'];

        if (!ContentBlockNameValidator::isValid($vendor)) {
            throw new \RuntimeException('Vendor name "' . $vendor . '" does not match requirements.');
        }

        if (!ContentBlockNameValidator::isValid($name)) {
            throw new \RuntimeException('Content Block name "' . $name . '" does not match requirements.');
        }
        $contentBlockData['contentBlock'] = is_array($contentBlockData['contentBlock']) ? $contentBlockData['contentBlock'] : json_decode($contentBlockData['contentBlock'], true);

        $data = [
            'contentType' => $contentBlockData['contentType'],
            'extension' => $contentBlockData['extension'],
            'mode' => $contentBlockData['mode'],
            'contentBlock' => [
                'name' => $vendor . '/' . $name,
            ],
        ];

        if ($contentBlockData['mode'] === 'copy') {
            $data['contentBlock']['initialVendor'] = $contentBlockData['initialVendor'];
            $data['contentBlock']['initialName'] = $contentBlockData['initialName'];
        }

        // TODO: Maybe extract title, priority, etc out of the if statement, as this is used for all three content types
        if ($data['contentType'] === 'content-element') {
            $data['contentBlock']['fields'] = $contentBlockData['contentBlock']['fields'] ?? [];
            $data['contentBlock']['basics'] = $contentBlockData['contentBlock']['basics'] ?? [];
            // Only include optional fields when they have non-empty values.
            // Omitting them lets content-blocks core use its own defaults
            // (e.g. typeName is auto-generated from the block name).
            $optionalFields = [
                'group', 'prefixFields', 'prefixType', 'table',
                'typeField', 'typeName', 'priority', 'title', 'vendorPrefix',
            ];
            foreach ($optionalFields as $field) {
                $value = $contentBlockData['contentBlock'][$field] ?? null;
                if ($value !== null && $value !== '' && $value !== 0) {
                    $data['contentBlock'][$field] = $value;
                }
            }
        } elseif ($data['contentType'] === 'page-type') {
            $typeName = $contentBlockData['contentBlock']['type'] ?? random_int(10000, 99999);
            PageTypeNameValidator::validate($typeName, $vendor . '/' . $name);
            $data['contentBlock']['type'] = (int) $typeName;
            foreach (['prefixFields', 'prefixType'] as $field) {
                $value = $contentBlockData['contentBlock'][$field] ?? null;
                if ($value !== null && $value !== '') {
                    $data['contentBlock'][$field] = $value;
                }
            }
        } elseif ($data['contentType'] === 'record-type') {
            $data['contentBlock']['fields'] = $contentBlockData['contentBlock']['fields'] ?? [];
            foreach (['typeName', 'title', 'table', 'labelField'] as $field) {
                $value = $contentBlockData['contentBlock'][$field] ?? null;
                if ($value !== null && $value !== '') {
                    $data['contentBlock'][$field] = $value;
                }
            }
        } elseif ($data['contentType'] === 'basic') {
            $data['contentBlock']['fields'] = $contentBlockData['contentBlock']['fields'];
        }

        return $data;
    }

    public function handleContentElement($data): AnswerInterface
    {
        $contentTypeName = $data['contentBlock']['name'];
        [$vendor, $name] = explode('/', $contentTypeName, 2);

        // Validate that extension exists
        $availablePackages = $this->packageResolver->getAvailablePackages();
        if (!array_key_exists($data['extension'], $availablePackages)) {
            throw new \RuntimeException('The extension "' . $data['extension'] . '" could not be found.');
        }

        // Use ConfigBuilder for proper defaults (e.g. typeName auto-generated from name).
        // ConfigBuilder preserves fields from $data['contentBlock'] when non-empty.
        $yamlConfiguration = $this->configBuilder->build(
            ContentType::CONTENT_ELEMENT,
            $vendor,
            $name,
            $data['contentBlock']['title'] ?? $contentTypeName,
            $data['contentBlock']['typeName'] ?? null,
            $data['contentBlock'],
        );

        $extPath = $this->getExtPath($data['extension'], ContentType::CONTENT_ELEMENT);

        $contentBlock = new LoadedContentBlock(
            name: $contentTypeName,
            yaml: $yamlConfiguration,
            icon: new ContentTypeIcon(),
            hostExtension: $data['extension'],
            extPath: $extPath,
            contentType: ContentType::CONTENT_ELEMENT,
        );

        $this->handleContentType(
            $data['mode'],
            $contentBlock,
            $data['contentBlock']['initialVendor'] ?? '',
            $data['contentBlock']['initialName'] ?? '',
        );

        return new DataAnswer(
            'contentType',
            [
                'type' => 'content-element',
                'name' => $contentTypeName,
            ],
        );
    }
    public function handlePageType(array $data): AnswerInterface
    {
        // name is already in vendor/name format from getContentTypeData()
        $contentTypeName = $data['contentBlock']['name'];
        [$vendor, $name] = explode('/', $contentTypeName, 2);

        // Validate that extension exists
        $availablePackages = $this->packageResolver->getAvailablePackages();
        if (!array_key_exists($data['extension'], $availablePackages)) {
            throw new \RuntimeException('The extension "' . $data['extension'] . '" could not be found.');
        }

        // Use ConfigBuilder like CreateContentBlockCommand does
        $yamlConfiguration = $this->configBuilder->build(
            ContentType::PAGE_TYPE,
            $vendor,
            $name,
            $data['contentBlock']['title'] ?? $contentTypeName,
            $data['contentBlock']['type'], // Page type needs the type number
            $data['contentBlock'], // Pass additional config
        );

        // Create properly configured LoadedContentBlock for page type
        $extPath = $this->getExtPath($data['extension'], ContentType::PAGE_TYPE);

        $contentBlock = new LoadedContentBlock(
            name: $contentTypeName,
            yaml: $yamlConfiguration,
            icon: new ContentTypeIcon(),
            hostExtension: $data['extension'],
            extPath: $extPath,
            contentType: ContentType::PAGE_TYPE,
        );

        $this->handleContentType(
            $data['mode'],
            $contentBlock,
            $data['contentBlock']['initialVendor'] ?? '',
            $data['contentBlock']['initialName'] ?? '',
        );

        return new DataAnswer(
            'contentType',
            [
                'type' => 'page-type',
                'name' => $contentTypeName,
            ],
        );
    }

    public function handleRecordType(array $data): AnswerInterface
    {
        // name is already in vendor/name format from getContentTypeData()
        $contentTypeName = $data['contentBlock']['name'];
        [$vendor, $name] = explode('/', $contentTypeName, 2);

        // Validate that extension exists
        $availablePackages = $this->packageResolver->getAvailablePackages();
        if (!array_key_exists($data['extension'], $availablePackages)) {
            throw new \RuntimeException('The extension "' . $data['extension'] . '" could not be found.');
        }

        // Use ConfigBuilder like CreateContentBlockCommand does
        $yamlConfiguration = $this->configBuilder->build(
            ContentType::RECORD_TYPE,
            $vendor,
            $name,
            $data['contentBlock']['title'] ?? $contentTypeName,
            $data['contentBlock']['typeName'] ?? null,
            $data['contentBlock'], // Pass additional config
        );

        // Create properly configured LoadedContentBlock for record type
        $extPath = $this->getExtPath($data['extension'], ContentType::RECORD_TYPE);

        $contentBlock = new LoadedContentBlock(
            name: $contentTypeName,
            yaml: $yamlConfiguration,
            icon: new ContentTypeIcon(),
            hostExtension: $data['extension'],
            extPath: $extPath,
            contentType: ContentType::RECORD_TYPE,
        );

        $this->handleContentType(
            $data['mode'],
            $contentBlock,
            $data['contentBlock']['initialVendor'] ?? '',
            $data['contentBlock']['initialName'] ?? '',
        );

        return new DataAnswer(
            'contentType',
            [
                'type' => 'record-type',
                'name' => $contentTypeName,
            ],
        );
    }

    public function handleBasic(array $data): AnswerInterface
    {
        $identifier = $data['contentBlock']['vendor'] . '/' . $data['contentBlock']['name'];

        // Build YAML configuration for basics
        $yamlConfiguration = [
            'identifier' => $identifier,
            'fields' => $data['contentBlock']['fields'],
        ];

        // Use PackageResolver from EXT:content_blocks to get proper paths
        $availablePackages = $this->packageResolver->getAvailablePackages();
        $basePath = $availablePackages[$data['extension']]->getPackagePath() . ContentBlockPathUtility::getRelativeBasicsPath();
        $basicsFileName = ucfirst($data['contentBlock']['name']) . '.yaml';

        // Ensure directory exists using EXT:content_blocks patterns
        if (!is_dir($basePath)) {
            GeneralUtility::mkdir_deep($basePath);
        }

        // Write the basics file
        file_put_contents(
            $basePath . '/' . $basicsFileName,
            Yaml::dump($yamlConfiguration, 10, 2),
        );

        return new DataAnswer(
            'contentType',
            [
                'type' => 'basic',
                'identifier' => $identifier,
            ],
        );
    }

    /**
     * @throws \RuntimeException
     */
    protected function handleContentType(
        string $mode,
        LoadedContentBlock $contentBlock,
        string $initialVendor = '',
        string $initialName = '',
    ): void {
        $contentBlockName = $contentBlock->getName();

        if ($this->contentBlockRegistry->hasContentBlock($contentBlockName) && $mode === 'create') {
            throw new \RuntimeException('A content block with the name "' . $contentBlockName . '" already exists.');
        } elseif ($this->contentBlockRegistry->hasContentBlock($contentBlockName) && $mode === 'edit') {
            $this->updateContentBlock($contentBlock);
        } elseif ($mode === 'copy') {
            if ($this->contentBlockRegistry->hasContentBlock($contentBlockName)) {
                throw new \RuntimeException('A content block with the name "' . $contentBlockName . '" already exists.');
            }
            $initialContentBlockName = $initialVendor . '/' . $initialName;
            if (!$this->contentBlockRegistry->hasContentBlock($initialContentBlockName)) {
                throw new \RuntimeException('The initial content block with the name "' . $initialContentBlockName . '" doesn\'t exist.');
            }
            $this->copyContentType($contentBlock, $initialContentBlockName);
        } else {
            // Use ContentBlockBuilder for creation - it handles all file operations
            $this->contentBlockBuilder->create($contentBlock);
        }

        // Always flush caches and update database schema after any operation.
        // Edit may add new fields (new columns), copy creates new blocks
        // (potentially new tables), and create always needs both.
        $result = $this->databaseUtility->updateDatabaseSchema();
        if (isset($result['error'])) {
            throw new \RuntimeException('Database schema update failed: ' . $result['error']);
        }

        // Reload the registry after any content block operation
        $this->contentBlockLoader->loadUncached();
    }

    protected function copyContentType(
        LoadedContentBlock $contentBlock,
        string $initialContentBlockName,
    ): void {
        // First create the new content block using ContentBlockBuilder
        $this->contentBlockBuilder->create($contentBlock);

        // Get the initial content block to copy files from
        $initialContentBlock = $this->contentBlockRegistry->getContentBlock($initialContentBlockName);

        // Copy files and folders from initial content block using EXT:content_blocks paths
        $this->copyContentBlockFilesAndFolders(
            GeneralUtility::getFileAbsFileName($initialContentBlock->getExtPath()),
            GeneralUtility::getFileAbsFileName($contentBlock->getExtPath()),
        );
    }

    protected function copyContentBlockFilesAndFolders($source, $destination): void
    {
        if (is_dir($source)) {
            @mkdir($destination);
            $directory = dir($source);
            while (false !== ($entry = $directory->read())) {
                if ($entry == '.' || $entry == '..' || $entry === 'EditorInterface.yaml') {
                    continue;
                }
                $this->copyContentBlockFilesAndFolders("$source/$entry", "$destination/$entry");
            }
            $directory->close();
        } else {
            copy($source, $destination);
        }
    }

    /**
     * Get extension path for content type (from CreateContentBlockCommand)
     */
    protected function getExtPath(string $extension, ContentType $contentType): string
    {
        $base = 'EXT:' . $extension . '/';
        return match ($contentType) {
            ContentType::CONTENT_ELEMENT => $base . ContentBlockPathUtility::getRelativeContentElementsPath(),
            ContentType::PAGE_TYPE => $base . ContentBlockPathUtility::getRelativePageTypesPath(),
            ContentType::RECORD_TYPE => $base . ContentBlockPathUtility::getRelativeRecordTypesPath(),
            ContentType::FILE_TYPE => $base . ContentBlockPathUtility::getRelativeFileTypesPath(),
        };
    }

    /**
     * Update existing content block instead of creating new one
     * Uses the same logic as ContentBlockBuilder but bypasses existence checks
     */
    protected function updateContentBlock(LoadedContentBlock $contentBlock): void
    {
        // Get the existing content block and its base path
        $existingContentBlock = $this->contentBlockRegistry->getContentBlock($contentBlock->getName());
        $basePath = GeneralUtility::getFileAbsFileName($existingContentBlock->getExtPath());

        // Update config.yaml file
        $this->updateConfigYaml($contentBlock, $basePath);

        // Update language files
        $this->updateLabelsXlf($contentBlock, $basePath);
    }

    /**
     * Update config.yaml file (based on ContentBlockBuilder::createConfigYaml)
     */
    protected function updateConfigYaml(LoadedContentBlock $contentBlock, string $basePath): void
    {
        $contentType = $contentBlock->getContentType();
        $yamlContent = $contentBlock->getYaml();

        // Clean field-level properties (boolean casting, empty string removal, UI wrapper unwrap)
        if (isset($yamlContent['fields']) && is_array($yamlContent['fields'])) {
            $yamlContent['fields'] = $this->cleanFieldsForSave($yamlContent['fields']);
        }

        // Remove root-level properties that match default values
        $yamlContent = $this->removeDefaultValues($yamlContent, $contentType);

        if ($contentType !== ContentType::RECORD_TYPE) {
            unset($yamlContent['table']);
            unset($yamlContent['typeField']);
        }
        GeneralUtility::writeFile(
            $basePath . '/' . ContentBlockPathUtility::getContentBlockDefinitionFileName(),
            Yaml::dump($yamlContent, 10, 2),
        );
    }

    /**
     * Remove fields that match default values to keep config.yaml clean
     * Based on https://docs.typo3.org/p/friendsoftypo3/content-blocks/main/en-us/YamlReference/Root/Index.html#yaml_reference_common
     */
    /**
     * Remove values that match the ConfigBuilder defaults to keep config.yaml minimal.
     * Uses ConfigBuilder to generate defaults dynamically so this stays in sync with the vendor package.
     */
    protected function removeDefaultValues(array $yamlContent, ContentType $contentType): array
    {
        $name = $yamlContent['name'] ?? 'dummy/dummy';
        $parts = explode('/', $name);
        $vendor = $parts[0];
        $package = $parts[1] ?? 'dummy';
        $typeName = $yamlContent['typeName'] ?? null;

        $defaults = $this->configBuilder->build($contentType, $vendor, $package, null, $typeName, []);

        // Remove keys where value matches the generated default
        foreach ($defaults as $key => $defaultValue) {
            if ($key === 'name' || $key === 'fields' || $key === 'title' || $key === 'description' || $key === 'typeName') {
                continue;
            }
            if (isset($yamlContent[$key]) && $yamlContent[$key] === $defaultValue) {
                unset($yamlContent[$key]);
            }
        }

        // Remove empty arrays and null values
        return array_filter($yamlContent, function ($value) {
            return $value !== null && $value !== [] && $value !== '';
        });
    }

    /**
     * Update language files (based on ContentBlockBuilder::createLabelsXlf)
     */
    protected function updateLabelsXlf(LoadedContentBlock $contentBlock, string $basePath): void
    {
        $xliffContent = $this->languageFileGenerator->generate($contentBlock);
        GeneralUtility::writeFile(
            $basePath . '/' . ContentBlockPathUtility::getLanguageFilePath(),
            $xliffContent,
        );
    }
}
