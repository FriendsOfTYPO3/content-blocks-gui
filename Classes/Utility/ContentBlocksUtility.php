<?php

declare(strict_types=1);

/*
 * This file is part of the TYPO3 CMS project.
 *
 * It is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License, either version 2
 * of the License, or any later version.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 *
 * The TYPO3 project - inspiring people to share!
 */

namespace FriendsOfTYPO3\ContentBlocksGui\Utility;

use FriendsOfTYPO3\ContentBlocksGui\Answer\AnswerInterface;
use FriendsOfTYPO3\ContentBlocksGui\Answer\DataAnswer;
use FriendsOfTYPO3\ContentBlocksGui\Answer\ErrorBasicNotFoundAnswer;
use FriendsOfTYPO3\ContentBlocksGui\Answer\ErrorContentBlockNotFoundAnswer;
use FriendsOfTYPO3\ContentBlocksGui\Answer\ErrorDownloadContentTypeAnswer;
use FriendsOfTYPO3\ContentBlocksGui\Answer\ErrorMissingBasicIdentifierAnswer;
use FriendsOfTYPO3\ContentBlocksGui\Answer\ErrorMissingContentBlockNameAnswer;
use FriendsOfTYPO3\ContentBlocksGui\Answer\ErrorNoBasicsAvailableAnswer;
use FriendsOfTYPO3\ContentBlocksGui\Answer\ErrorSaveContentTypeAnswer;
use FriendsOfTYPO3\ContentBlocksGui\Answer\SuccessAnswer;
use FriendsOfTYPO3\ContentBlocksGui\Factory\UsageFactory;
use FriendsOfTYPO3\ContentBlocksGui\Service\ContentTypeService;
use Psr\Http\Message\ResponseInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Yaml\Yaml;
use TYPO3\CMS\Backend\Routing\Exception\RouteNotFoundException;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\ContentBlocks\Basics\BasicsLoader;
use TYPO3\CMS\ContentBlocks\Basics\BasicsRegistry;
use TYPO3\CMS\ContentBlocks\Builder\ContentBlockBuilder;
use TYPO3\CMS\ContentBlocks\Definition\ContentType\ContentType;
use TYPO3\CMS\ContentBlocks\Definition\Factory\UniqueIdentifierCreator;
use TYPO3\CMS\ContentBlocks\Definition\TableDefinitionCollection;
use TYPO3\CMS\ContentBlocks\Loader\ContentBlockLoader;
use TYPO3\CMS\ContentBlocks\Loader\LoadedContentBlock;
use TYPO3\CMS\ContentBlocks\Registry\ContentBlockRegistry;
use TYPO3\CMS\ContentBlocks\Registry\LanguageFileRegistry;
use TYPO3\CMS\ContentBlocks\Service\PackageResolver;
use TYPO3\CMS\ContentBlocks\Utility\ContentBlockPathUtility;
use TYPO3\CMS\Core\Cache\CacheManager;
use TYPO3\CMS\Core\Core\Environment;
use TYPO3\CMS\Core\Http\ResponseFactory;
use TYPO3\CMS\Core\Http\StreamFactory;
use TYPO3\CMS\Core\Localization\LanguageService;
use TYPO3\CMS\Core\Package\Exception;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Utility\PathUtility;

class ContentBlocksUtility
{
    protected readonly ContentBlockRegistry $contentBlockRegistry;

    public function __construct(
        protected readonly LoggerInterface $logger,
        protected readonly ResponseFactory $responseFactory,
        protected readonly StreamFactory $streamFactory,
        protected readonly TableDefinitionCollection $tableDefinitionCollection,
        protected readonly ContentBlockPathUtility $contentBlockPathUtility,
        protected readonly LanguageFileRegistry $languageFileRegistry,
        protected BasicsRegistry $basicsRegistry,
        protected readonly BasicsLoader $basicsLoader,
        protected readonly PackageResolver $packageResolver,
        protected readonly ContentBlockBuilder $contentBlockBuilder,
        protected readonly ContentTypeService $contentTypeService,
        protected readonly ContentBlockLoader $contentBlockLoader,
        protected readonly UsageFactory $usageFactory,
        protected readonly ExtensionUtility $extensionUtility,
        protected readonly UriBuilder $backendUriBuilder,
        protected readonly DatabaseUtility $databaseUtility,
    ) {
        $this->contentBlockRegistry = $this->contentBlockLoader->loadUncached();
    }

    public function saveContentType(array $parsedBody): AnswerInterface
    {
        try {
            $data = $this->contentTypeService->getContentTypeData($parsedBody);
            return match ($parsedBody['contentType']) {
                'content-element' => $this->contentTypeService->handleContentElement($data),
                'page-type' => $this->contentTypeService->handlePageType($data),
                'record-type' => $this->contentTypeService->handleRecordType($data),
                'basic' => $this->contentTypeService->handleBasic($data),
                default => throw new \RuntimeException('Unknown content type: ' . $parsedBody['contentType']),
            };
        } catch (\RuntimeException $e) {
            $this->logger->error($e->getMessage());
            return new ErrorSaveContentTypeAnswer($e->getMessage());
        }
    }

    public function downloadContentBlock(object|array|null $getParsedBody): ResponseInterface
    {
        try {
            if (!isset($getParsedBody['name'])) {
                $errorAnswer = new ErrorContentBlockNotFoundAnswer('Missing required parameter "name"');
                return $errorAnswer->getResponse();
            }
            $fileName = $this->createZipFileFromContentBlock($getParsedBody['name']);
            $response = $this->responseFactory
                ->createResponse()
                ->withAddedHeader('Content-Type', 'application/zip')
                ->withAddedHeader('Content-Length', (string) (filesize($fileName) ?: ''))
                ->withAddedHeader('Content-Disposition', 'attachment; filename="' . PathUtility::basename($fileName) . '"')
                ->withBody($this->streamFactory->createStreamFromFile($fileName));

            unlink($fileName);

            return $response;
        } catch (\Exception $e) {
            $this->logger->error($e->getMessage());
            $errorAnswer = new ErrorDownloadContentTypeAnswer($e->getMessage());
            return $errorAnswer->getResponse();
        }
    }

    public function deleteContentBlock(string $name): array
    {
        try {
            $absoluteContentBlockPath = ExtensionManagementUtility::resolvePackagePath(
                $this->contentBlockRegistry->getContentBlockExtPath($name),
            );
            $result = $this->deleteDirectoryRecursively($absoluteContentBlockPath);

            // Flush caches so the DI container and content block registry
            // no longer reference the deleted content block.
            $cacheManager = GeneralUtility::makeInstance(CacheManager::class);
            $cacheManager->flushCachesInGroup('system');
            $cacheManager->getCache('typoscript')->flush();

            return $result;
        } catch (Exception $e) {
            $this->logger->error($e->getMessage());
            return [];
        }
    }

    /**
     * Duplicate a content block by copying the directory
     *
     * @param string $sourceName The source content block name (vendor/name format)
     * @param string $targetExtension The target extension
     * @param string $targetVendor The target vendor name
     * @param string $targetName The target content block name
     * @param string $duplicationStrategy Strategy for RecordTypes: 'shared-table' or 'new-table' (default: 'auto')
     * @param string|null $customTypeName Custom type name for shared-table strategy
     * @param string|null $customTableName Custom table name for new-table strategy
     * @throws \RuntimeException
     */
    public function duplicateContentBlock(
        string $sourceName,
        string $targetExtension,
        string $targetVendor,
        string $targetName,
        string $duplicationStrategy = 'auto',
        ?string $customTypeName = null,
        ?string $customTableName = null,
    ): void {
        // Check if source content block exists
        if (!$this->contentBlockRegistry->hasContentBlock($sourceName)) {
            throw new \RuntimeException('Source content block "' . $sourceName . '" does not exist.');
        }

        // Get source content block
        $sourceContentBlock = $this->contentBlockRegistry->getContentBlock($sourceName);
        $contentType = $sourceContentBlock->getContentType();

        // Construct target name
        $targetFullName = $targetVendor . '/' . $targetName;

        // Check if target content block already exists
        if ($this->contentBlockRegistry->hasContentBlock($targetFullName)) {
            throw new \RuntimeException('Target content block "' . $targetFullName . '" already exists.');
        }

        // Get source and target paths
        $sourceExtPath = $sourceContentBlock->getExtPath();
        $sourceAbsolutePath = ExtensionManagementUtility::resolvePackagePath($sourceExtPath);

        // Build target path based on content type
        $contentTypeFolder = match ($contentType->name) {
            'CONTENT_ELEMENT' => 'ContentElements',
            'PAGE_TYPE' => 'PageTypes',
            'RECORD_TYPE' => 'RecordTypes',
            default => throw new \RuntimeException('Unsupported content type: ' . $contentType->name),
        };

        $targetExtPath = 'EXT:' . $targetExtension . '/ContentBlocks/' . $contentTypeFolder . '/' . $targetName . '/';
        $targetAbsolutePath = ExtensionManagementUtility::resolvePackagePath($targetExtPath);

        // Check if target directory already exists to prevent overwriting
        if (is_dir($targetAbsolutePath)) {
            throw new \RuntimeException(
                sprintf(
                    'Cannot duplicate content block: Target directory already exists at "%s". ' .
                    'A content block with the name "%s" already exists in extension "%s".',
                    $targetAbsolutePath,
                    $targetName,
                    $targetExtension,
                ),
            );
        }

        // Create target directory
        if (!is_dir(dirname($targetAbsolutePath))) {
            GeneralUtility::mkdir_deep(dirname($targetAbsolutePath));
        }

        // Copy the entire directory
        $this->recursiveCopy($sourceAbsolutePath, $targetAbsolutePath);

        // Update the config.yaml with new name and handle type-specific configuration
        $configFile = $targetAbsolutePath . ContentBlockPathUtility::getContentBlockDefinitionFileName();
        $needsDatabaseUpdate = false;

        if (file_exists($configFile)) {
            $yaml = Yaml::parseFile($configFile);
            $yaml['name'] = $targetFullName;
            // Remove vendor field if it exists since name already contains vendor/name format
            unset($yaml['vendor']);

            // Handle PageType: Always generate new typeName (integer)
            if ($contentType->name === 'PAGE_TYPE') {
                $yaml['typeName'] = time();
            }

            // Handle RecordType: Apply duplication strategy
            if ($contentType->name === 'RECORD_TYPE') {
                $hasTypeField = isset($yaml['typeField']);

                // Auto-detect strategy if not specified
                if ($duplicationStrategy === 'auto') {
                    $duplicationStrategy = $hasTypeField ? 'shared-table' : 'new-table';
                }

                if ($duplicationStrategy === 'shared-table' && $hasTypeField) {
                    // Strategy 1: Add as new type to shared table
                    // Keep table and typeField unchanged
                    $yaml['typeName'] = $customTypeName ?? strtolower(str_replace(['/', '-'], '_', $targetFullName));
                } elseif ($duplicationStrategy === 'new-table' || !$hasTypeField) {
                    // Strategy 2: Create independent RecordType with new table
                    // OR source has no typeField (auto-fallback to new table)
                    $newTableName = $customTableName ?? 'tx_' . str_replace(['/', '-'], '_', $targetFullName);
                    $yaml['table'] = $newTableName;

                    // Remove multi-type configuration
                    unset($yaml['typeField']);
                    unset($yaml['typeName']);

                    // Mark that we need to update database schema
                    $needsDatabaseUpdate = true;
                }
            }

            file_put_contents($configFile, Yaml::dump($yaml, 10, 2));
        }

        // Reload content blocks to register the new one
        $this->contentBlockLoader->loadUncached();

        // Update database schema if a new table was created
        if ($needsDatabaseUpdate) {
            $result = $this->databaseUtility->updateDatabaseSchema();

            if (isset($result['error'])) {
                $this->logger->error('Failed to update database schema after duplication', [
                    'error' => $result['error'],
                    'targetContentBlock' => $targetFullName,
                ]);
                throw new \RuntimeException('Database schema update failed: ' . $result['error']);
            }

            if (isset($result['success'])) {
                $this->logger->info('Database schema updated after content block duplication', [
                    'targetContentBlock' => $targetFullName,
                    'message' => $result['success'],
                ]);
            }
        } else {
            $cacheManager = GeneralUtility::makeInstance(CacheManager::class);
            $cacheManager->flushCachesInGroup('system');
            $cacheManager->getCache('typoscript')->flush();
        }
    }

    /**
     * Duplicate a Basic to a new identifier and extension
     *
     * @param string $sourceIdentifier The source basic identifier (e.g., "basic-99/basic-99")
     * @param string $targetExtension The target extension key
     * @param string $targetIdentifier The new basic identifier (e.g., "basic-100/basic-100")
     * @throws \RuntimeException
     */
    public function duplicateBasic(
        string $sourceIdentifier,
        string $targetExtension,
        string $targetIdentifier,
    ): void {
        // Load basics to ensure registry is populated
        $this->basicsRegistry = $this->basicsLoader->loadUncached();

        // Check if source basic exists
        if (!$this->basicsRegistry->hasBasic($sourceIdentifier)) {
            throw new \RuntimeException('Source basic "' . $sourceIdentifier . '" does not exist.');
        }

        // Check if target basic already exists (prevent identifier collision)
        if ($this->basicsRegistry->hasBasic($targetIdentifier)) {
            throw new \RuntimeException(
                sprintf(
                    'Cannot duplicate basic: A basic with identifier "%s" already exists in the system.',
                    $targetIdentifier,
                ),
            );
        }

        // Get source basic
        $sourceBasic = $this->basicsRegistry->getBasic($sourceIdentifier);

        // Build target path
        $targetExtPath = 'EXT:' . $targetExtension . '/ContentBlocks/Basics/';
        $targetBasePath = ExtensionManagementUtility::resolvePackagePath($targetExtPath);

        // Create Basics directory if it doesn't exist
        if (!is_dir($targetBasePath)) {
            GeneralUtility::mkdir_deep($targetBasePath);
        }

        // Generate target file name from identifier
        // Convert identifier like "vendor/name" to "name.yaml"
        $identifierParts = explode('/', $targetIdentifier);
        $targetFileName = end($identifierParts) . '.yaml';
        $targetFilePath = $targetBasePath . $targetFileName;

        // Check if target file already exists (prevent overwriting)
        if (file_exists($targetFilePath)) {
            throw new \RuntimeException(
                sprintf(
                    'Cannot duplicate basic: Target file already exists at "%s". ' .
                    'A basic with the file name "%s" already exists in extension "%s".',
                    $targetFilePath,
                    $targetFileName,
                    $targetExtension,
                ),
            );
        }

        // Read and parse source YAML
        $yaml = $sourceBasic->toArray();

        // Update identifier
        $yaml['identifier'] = $targetIdentifier;
        unset($yaml['hostExtension']);

        // Write to target file
        file_put_contents($targetFilePath, Yaml::dump($yaml, 10, 2));

        // Reload basics to register the new one
        $this->basicsLoader->loadUncached();

        $this->logger->info('Basic duplicated successfully', [
            'sourceIdentifier' => $sourceIdentifier,
            'targetIdentifier' => $targetIdentifier,
            'targetExtension' => $targetExtension,
            'targetFile' => $targetFilePath,
        ]);
    }

    /**
     * Download a Basic as a ZIP file
     *
     * @param string $identifier The basic identifier (e.g., "basic-99/basic-99")
     * @return ResponseInterface
     * @throws \RuntimeException
     */
    public function downloadBasic(string $identifier): ResponseInterface
    {
        try {
            // Load basics to ensure registry is populated
            $this->basicsRegistry = $this->basicsLoader->loadUncached();

            // Check if basic exists
            if (!$this->basicsRegistry->hasBasic($identifier)) {
                throw new \RuntimeException('Basic "' . $identifier . '" does not exist.');
            }

            // Get basic
            $basic = $this->basicsRegistry->getBasic($identifier);
            $hostExtension = $basic->getHostExtension();

            // Build path to the Basics directory
            $basicsPath = 'EXT:' . $hostExtension . '/ContentBlocks/Basics/';
            $absoluteBasicsPath = ExtensionManagementUtility::resolvePackagePath($basicsPath);

            // Find the file with matching identifier
            $absoluteFilePath = self::findBasicFilePath($absoluteBasicsPath, $identifier);

            if ($absoluteFilePath === null) {
                throw new \RuntimeException('Could not find YAML file with identifier: ' . $identifier);
            }

            $fileName = PathUtility::basename($absoluteFilePath);

            // Create temporary directory for ZIP
            $temporaryPath = Environment::getVarPath() . '/transient/';
            if (!@is_dir($temporaryPath)) {
                GeneralUtility::mkdir($temporaryPath);
            }

            // Create ZIP file name
            $zipFileName = $temporaryPath . str_replace('/', '_', $identifier) . '_' . date('YmdHi', time()) . '.zip';

            // Create ZIP archive
            $zip = new \ZipArchive();
            $zip->open($zipFileName, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);

            // Add the YAML file to the ZIP inside Basics/ directory
            $zip->addFile($absoluteFilePath, 'Basics/' . $fileName);
            $zip->close();

            // Create HTTP response with the ZIP file
            $response = $this->responseFactory
                ->createResponse()
                ->withAddedHeader('Content-Type', 'application/zip')
                ->withAddedHeader('Content-Length', (string) (filesize($zipFileName) ?: ''))
                ->withAddedHeader('Content-Disposition', 'attachment; filename="' . PathUtility::basename($zipFileName) . '"')
                ->withBody($this->streamFactory->createStreamFromFile($zipFileName));

            // Clean up temporary file
            unlink($zipFileName);

            $this->logger->info('Basic downloaded successfully', [
                'identifier' => $identifier,
                'file' => $fileName,
            ]);

            return $response;
        } catch (\Exception $e) {
            $this->logger->error('Failed to download basic', [
                'identifier' => $identifier,
                'error' => $e->getMessage(),
            ]);
            throw new \RuntimeException('Failed to download basic: ' . $e->getMessage());
        }
    }

    /**
     * Delete a Basic by identifier
     *
     * @param string $identifier The Basic identifier
     * @return array Array of not deleted file paths (empty on success)
     */
    public function deleteBasic(string $identifier): array
    {
        try {
            // Load basics to ensure registry is populated
            $this->basicsRegistry = $this->basicsLoader->loadUncached();

            // Check if basic exists
            if (!$this->basicsRegistry->hasBasic($identifier)) {
                throw new \RuntimeException('Basic "' . $identifier . '" does not exist.');
            }

            // Get basic
            $basic = $this->basicsRegistry->getBasic($identifier);
            $hostExtension = $basic->getHostExtension();

            // Build path to the Basics directory
            $basicsPath = 'EXT:' . $hostExtension . '/ContentBlocks/Basics/';
            $absoluteBasicsPath = ExtensionManagementUtility::resolvePackagePath($basicsPath);

            // Find the file with matching identifier
            $fileToDelete = self::findBasicFilePath($absoluteBasicsPath, $identifier);

            if ($fileToDelete === null) {
                throw new \RuntimeException('Could not find YAML file with identifier: ' . $identifier);
            }

            // Delete the file
            if (!unlink($fileToDelete)) {
                $this->logger->error('Failed to delete basic file', [
                    'identifier' => $identifier,
                    'file' => $fileToDelete,
                ]);
                return [$fileToDelete];
            }

            $this->logger->info('Basic deleted successfully', [
                'identifier' => $identifier,
                'file' => $fileToDelete,
            ]);

            // Flush caches so the DI container and basics registry
            // no longer reference the deleted basic.
            $cacheManager = GeneralUtility::makeInstance(CacheManager::class);
            $cacheManager->flushCachesInGroup('system');
            $cacheManager->getCache('typoscript')->flush();

            return [];
        } catch (\Exception $e) {
            $this->logger->error('Failed to delete basic', [
                'identifier' => $identifier,
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }

    /**
     * Validate RecordType duplication parameters
     *
     * @param string $sourceName The source content block name
     * @param string $duplicationStrategy 'shared-table' or 'new-table'
     * @param string|null $typeName The new type name (for shared-table)
     * @param string|null $tableName The new table name (for new-table)
     * @return array ['valid' => bool, 'errors' => string[]]
     */
    public function validateRecordTypeDuplication(
        string $sourceName,
        string $duplicationStrategy,
        ?string $typeName = null,
        ?string $tableName = null,
    ): array {
        $errors = [];

        // Check if source exists
        if (!$this->contentBlockRegistry->hasContentBlock($sourceName)) {
            return ['valid' => false, 'errors' => ['Source content block not found']];
        }

        $sourceContentBlock = $this->contentBlockRegistry->getContentBlock($sourceName);
        $sourceYaml = $sourceContentBlock->getYaml();
        $sourceTable = $sourceYaml['table'] ?? null;
        $sourceTypeField = $sourceYaml['typeField'] ?? null;

        // Validate strategy
        if (!in_array($duplicationStrategy, ['shared-table', 'new-table'], true)) {
            return ['valid' => false, 'errors' => ['Invalid duplication strategy. Must be "shared-table" or "new-table"']];
        }

        if ($duplicationStrategy === 'shared-table') {
            // Strategy: Add as new type to existing shared table

            // Must have a typeField in source
            if (!$sourceTypeField) {
                $errors[] = 'Cannot use shared-table strategy: source has no typeField configured';
            }

            // Validate typeName is provided
            if (empty($typeName)) {
                $errors[] = 'Type name is required for shared-table strategy';
            } else {
                // Validate typeName format (alphanumeric + underscore only)
                if (!preg_match('/^[a-zA-Z0-9_]+$/', $typeName)) {
                    $errors[] = 'Type name must contain only letters, numbers, and underscores';
                }

                // Check typeName uniqueness across all RecordTypes using this table
                $existingTypeNames = $this->getTypeNamesForTable($sourceTable, $sourceTypeField);
                if (in_array($typeName, $existingTypeNames, true)) {
                    $errors[] = sprintf(
                        'Type name "%s" already exists in table "%s". Existing types: %s. Please choose a different type name.',
                        $typeName,
                        $sourceTable,
                        implode(', ', $existingTypeNames),
                    );
                }
            }
        } elseif ($duplicationStrategy === 'new-table') {
            // Strategy: Create independent RecordType with new table

            // Validate table name is provided
            if (empty($tableName)) {
                $errors[] = 'Table name is required for new-table strategy';
            } else {
                // Validate table name format (SQL identifier rules)
                if (!preg_match('/^[a-zA-Z][a-zA-Z0-9_]*$/', $tableName)) {
                    $errors[] = 'Table name must start with a letter and contain only letters, numbers, and underscores';
                }

                // Check if table already exists
                if ($this->tableExists($tableName)) {
                    $errors[] = sprintf(
                        'Table "%s" already exists. Please choose a different table name.',
                        $tableName,
                    );
                }

                // Warning if not prefixed with tx_
                if (!str_starts_with($tableName, 'tx_')) {
                    $errors[] = 'Recommendation: Table name should start with "tx_" to group it with extension records in TYPO3';
                }
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Get all existing typeNames for a specific table and typeField combination
     *
     * @param string|null $table The table name
     * @param string|null $typeField The type field name
     * @return string[] List of existing type names
     */
    protected function getTypeNamesForTable(?string $table, ?string $typeField): array
    {
        if ($table === null || $typeField === null) {
            return [];
        }

        $typeNames = [];

        foreach ($this->contentBlockRegistry->getAll() as $contentBlock) {
            $yaml = $contentBlock->getYaml();

            // Check if this RecordType uses the same table and typeField
            if (($yaml['table'] ?? null) === $table &&
                ($yaml['typeField'] ?? null) === $typeField) {
                // Add the typeName (default to "1" if not specified)
                $typeNames[] = $yaml['typeName'] ?? '1';
            }
        }

        return $typeNames;
    }

    /**
     * Check if a database table already exists
     *
     * @param string $tableName The table name to check
     * @return bool True if table exists
     */
    protected function tableExists(string $tableName): bool
    {
        // Check if table is defined in TCA
        if (isset($GLOBALS['TCA'][$tableName])) {
            return true;
        }

        // Check if any existing ContentBlock uses this table
        foreach ($this->contentBlockRegistry->getAll() as $contentBlock) {
            $yaml = $contentBlock->getYaml();
            if (($yaml['table'] ?? null) === $tableName) {
                return true;
            }
        }

        return false;
    }

    /**
     * Recursively copy a directory
     */
    protected function recursiveCopy(string $source, string $destination): void
    {
        if (!is_dir($source)) {
            throw new \RuntimeException('Source directory does not exist: ' . $source);
        }

        if (!is_dir($destination)) {
            mkdir($destination, 0755, true);
        }

        $directory = opendir($source);
        try {
            while (($file = readdir($directory)) !== false) {
                if ($file === '.' || $file === '..') {
                    continue;
                }

                $sourcePath = $source . '/' . $file;
                $destinationPath = $destination . '/' . $file;

                if (is_dir($sourcePath)) {
                    $this->recursiveCopy($sourcePath, $destinationPath);
                } else {
                    copy($sourcePath, $destinationPath);
                }
            }
        } finally {
            closedir($directory);
        }
    }

    /**
     * Find the file path of a Basic by searching for its identifier in YAML files
     *
     * @param string $absoluteBasicsPath Absolute path to the Basics directory
     * @param string $identifier The Basic identifier to search for
     * @return string|null The absolute file path if found, null otherwise
     */
    public static function findBasicFilePath(string $absoluteBasicsPath, string $identifier): ?string
    {
        if (!is_dir($absoluteBasicsPath)) {
            return null;
        }

        $finder = new Finder();
        $finder->files()->name('*.yaml')->in($absoluteBasicsPath);

        foreach ($finder as $splFileInfo) {
            $yamlContent = Yaml::parseFile($splFileInfo->getPathname());
            if (is_array($yamlContent) && ($yamlContent['identifier'] ?? '') === $identifier) {
                return $splFileInfo->getPathname();
            }
        }

        return null;
    }

    /**
     * @throws Exception
     */
    private function deleteDirectoryRecursively(string $path): array
    {
        $notDeletedFilePaths = [];
        if (is_dir($path)) {
            $currentDirectory = opendir($path);
            try {
                while (($file = readdir($currentDirectory)) !== false) {
                    if ($file != "." && $file != "..") {
                        $currentFile = $path . DIRECTORY_SEPARATOR . $file;

                        if (is_dir($currentFile)) {
                            $this->deleteDirectoryRecursively($currentFile);
                        } else {
                            unlink($currentFile);
                        }
                    }
                }
            } finally {
                closedir($currentDirectory);
            }
            rmdir($path);
        } elseif (is_file($path)) {
            unlink($path);
        } else {
            // add hint that some parts could not be deleted
            $notDeletedFilePaths[] = $path;
        }
        return $notDeletedFilePaths;
    }

    /**
     * Create a ZIP file from a content block with type directory structure
     *
     * @param string $name Content block name (vendor/name format)
     * @return string Path to created ZIP file
     * @throws Exception
     */
    private function createZipFileFromContentBlock(string $name): string
    {
        $contentBlock = $this->contentBlockRegistry->getContentBlock($name);
        $contentType = $contentBlock->getContentType();
        $absoluteContentBlockPath = ExtensionManagementUtility::resolvePackagePath($contentBlock->getExtPath());

        // Determine type directory name
        $typeDirectory = $this->getTypeDirectory($contentType);

        // Get content block directory name (last part of path)
        $contentBlockDirName = basename($absoluteContentBlockPath);

        // Create temporary ZIP
        $temporaryPath = Environment::getVarPath() . '/transient/';
        if (!@is_dir($temporaryPath)) {
            GeneralUtility::mkdir($temporaryPath);
        }

        $fileName = $temporaryPath . str_replace('/', '_', $name) . '_' . date('YmdHi', time()) . '.zip';

        $zip = new \ZipArchive();
        $zip->open($fileName, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);

        // Get all files and folders
        $files = GeneralUtility::getAllFilesAndFoldersInPath(
            [],
            $absoluteContentBlockPath . '/',
            '',
            true,
            PHP_INT_MAX,
        );

        // Make paths relative to content block directory
        $files = GeneralUtility::removePrefixPathFromList($files, $absoluteContentBlockPath);
        $files = is_array($files) ? $files : [];

        foreach ($files as $file) {
            $fullPath = $absoluteContentBlockPath . $file;

            // Add with type directory prefix: ContentElements/test-12/config.yaml
            $zipPath = $typeDirectory . '/' . $contentBlockDirName . $file;

            if (is_dir($fullPath)) {
                $zip->addEmptyDir($zipPath);
            } else {
                $zip->addFile($fullPath, $zipPath);
            }
        }

        $zip->close();
        return $fileName;
    }

    /**
     * Get type directory name for a content type
     *
     * @param ContentType $contentType
     * @return string Directory name (e.g., 'ContentElements', 'PageTypes')
     */
    private function getTypeDirectory(ContentType $contentType): string
    {
        return match ($contentType->name) {
            'CONTENT_ELEMENT' => 'ContentElements',
            'PAGE_TYPE' => 'PageTypes',
            'RECORD_TYPE' => 'RecordTypes',
            'FILE_TYPE' => 'FileTypes',
        };
    }

    /**
     * Create a ZIP file containing multiple content blocks and/or basics
     *
     * @param array $blocks Array of blocks: [['type' => 'content-element', 'identifier' => 'vendor/name'], ...]
     * @return string Path to created ZIP file
     * @throws \RuntimeException
     */
    public function createMultiBlockZip(array $blocks): string
    {
        $temporaryPath = Environment::getVarPath() . '/transient/';
        if (!@is_dir($temporaryPath)) {
            GeneralUtility::mkdir($temporaryPath);
        }

        $count = count($blocks);
        $fileName = $temporaryPath . $count . '-blocks_' . date('YmdHi', time()) . '.zip';

        $zip = new \ZipArchive();
        $zip->open($fileName, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);

        foreach ($blocks as $block) {
            $type = $block['type'];
            $identifier = $block['identifier'];

            if ($type === 'basic') {
                $this->addBasicToZip($zip, $identifier);
            } else {
                $this->addContentBlockToZip($zip, $identifier);
            }
        }

        $zip->close();
        return $fileName;
    }

    /**
     * Add a content block to an existing ZIP archive
     *
     * @param \ZipArchive $zip
     * @param string $name Content block name (vendor/name format)
     * @throws \RuntimeException
     */
    private function addContentBlockToZip(\ZipArchive $zip, string $name): void
    {
        $contentBlock = $this->contentBlockRegistry->getContentBlock($name);
        $contentType = $contentBlock->getContentType();
        $absoluteContentBlockPath = ExtensionManagementUtility::resolvePackagePath($contentBlock->getExtPath());

        // Determine type directory name
        $typeDirectory = $this->getTypeDirectory($contentType);

        // Get content block directory name
        $contentBlockDirName = basename($absoluteContentBlockPath);

        // Get all files and folders
        $files = GeneralUtility::getAllFilesAndFoldersInPath(
            [],
            $absoluteContentBlockPath . '/',
            '',
            true,
            PHP_INT_MAX,
        );

        // Make paths relative
        $files = GeneralUtility::removePrefixPathFromList($files, $absoluteContentBlockPath);
        $files = is_array($files) ? $files : [];

        foreach ($files as $file) {
            $fullPath = $absoluteContentBlockPath . $file;
            $zipPath = $typeDirectory . '/' . $contentBlockDirName . $file;

            if (is_dir($fullPath)) {
                $zip->addEmptyDir($zipPath);
            } else {
                $zip->addFile($fullPath, $zipPath);
            }
        }
    }

    /**
     * Add a Basic to an existing ZIP archive
     *
     * @param \ZipArchive $zip
     * @param string $identifier Basic identifier (e.g., "basic-1/address")
     * @throws \RuntimeException
     */
    private function addBasicToZip(\ZipArchive $zip, string $identifier): void
    {
        $this->basicsRegistry = $this->basicsLoader->loadUncached();

        if (!$this->basicsRegistry->hasBasic($identifier)) {
            throw new \RuntimeException('Basic "' . $identifier . '" does not exist.');
        }

        $basic = $this->basicsRegistry->getBasic($identifier);
        $hostExtension = $basic->getHostExtension();

        $basicsPath = 'EXT:' . $hostExtension . '/ContentBlocks/Basics/';
        $absoluteBasicsPath = ExtensionManagementUtility::resolvePackagePath($basicsPath);

        $absoluteFilePath = self::findBasicFilePath($absoluteBasicsPath, $identifier);

        if ($absoluteFilePath === null) {
            throw new \RuntimeException('Could not find YAML file with identifier: ' . $identifier);
        }

        $fileName = PathUtility::basename($absoluteFilePath);

        // Add to Basics/ directory in ZIP
        $zip->addFile($absoluteFilePath, 'Basics/' . $fileName);
    }

    public function getAvailableContentBlocks(): array // AnswerInterface
    {
        $supportedTypes = ['CONTENT_ELEMENT', 'PAGE_TYPE', 'RECORD_TYPE']; // @todo: add FILE_TYPE support
        $resultList = [];
        foreach ($this->contentBlockRegistry->getAll() as $contentBlock) {
            $contentType = $contentBlock->getContentType();
            if (!in_array($contentType->name, $supportedTypes, true)) {
                continue;
            }
            $resultList[$contentType->name][$contentBlock->getName()] = $this->loadedContentBlockToArray($contentBlock);
        }
        $resultList['BASICS'] = $this->getLoadedBasicForList();
        return $resultList;

        // @todo: cleanup
        //        if (empty($resultList)) {
        //            return new ErrorNoContentBlocksAvailableAnswer();
        //        }
        //        return new DataAnswer(
        //            'list',
        //            $resultList
        //        );
    }

    protected function loadedContentBlockToArray(LoadedContentBlock $contentBlock): array
    {
        $typeName = $contentBlock->getYaml()['typeName'] ?? UniqueIdentifierCreator::createContentTypeIdentifier($contentBlock->getName());
        $table = $contentBlock->getContentType()->getTable() ?? $contentBlock->getYaml()['table'];
        // @todo We might not want to add this feature. This could lead to performance problems.
        $usages = $this->usageFactory->countUsages($contentBlock->getContentType(), $typeName, $table);

        $tableDefinition = $this->tableDefinitionCollection->getTable($table);
        $typeDefinition = $tableDefinition->contentTypeDefinitionCollection->getType($typeName);
        $label = $this->getLanguageService()->sL($typeDefinition->getLanguagePathTitle());

        $result = [
            'name' => $contentBlock->getName(),
            'label' => $label,
            'extension' => $contentBlock->getHostExtension(),
            'usages' => $usages,
            'icon' => $typeDefinition->getTypeIcon()->toArray()['iconIdentifier'],
            'contentType' => $contentBlock->getContentType()->name,
            'tableName' => $table,
        ];

        // Add RecordType-specific metadata for frontend duplication handling
        $yaml = $contentBlock->getYaml();
        if ($contentBlock->getContentType()->name === 'RECORD_TYPE') {
            $result['typeField'] = $yaml['typeField'] ?? null;
            $result['typeName'] = $yaml['typeName'] ?? null;
        }

        if ($this->extensionUtility->isEditable($contentBlock->getHostExtension())) {
            $result['editUrl'] = (string) $this->backendUriBuilder->buildUriFromRoute('content_block_gui_content_block_modify', [
                'type' => 'edit',
                'name' => $contentBlock->getName(),
            ]);
            $result['deleteUrl'] = (string) $this->backendUriBuilder->buildUriFromRoute('content_block_gui_content_block_delete', [
                'name' => $contentBlock->getName(),
            ]);
            $result['duplicateUrl'] = (string) $this->backendUriBuilder->buildUriFromRoute('content_block_gui_content_block_duplicate', [
                'sourceName' => $contentBlock->getName(),
            ]);
        }

        return $result;
    }

    /**
     * @throws RouteNotFoundException
     */
    protected function getLoadedBasicForList(): array
    {
        $list = [];
        $this->basicsRegistry = $this->basicsLoader->loadUncached();
        foreach ($this->basicsRegistry->getAllBasics() as $basic) {
            $isEditable = $this->extensionUtility->isEditable($basic->getHostExtension());
            $list[$basic->getIdentifier()] = [
                'name' => $basic->getIdentifier(),
                'label' => $basic->getIdentifier(),
                'extension' => $basic->getHostExtension(),
                'editable' => $isEditable, // TODO: if host extension is content_blocks, disable edit
                'deletable' => $isEditable, // TODO: if host extension is content_blocks, disable delete
                'editUrl' => $isEditable ? (string) $this->backendUriBuilder->buildUriFromRoute('content_block_gui_basic_modify', [
                    'type' => 'edit',
                    'identifier' => $basic->getIdentifier(),
                ]) : null,
                'deleteUrl' => $isEditable ? (string) $this->backendUriBuilder->buildUriFromRoute('content_block_gui_basic_delete', [
                    'identifier' => $basic->getIdentifier(),
                ]) : null,
                'duplicateUrl' => $isEditable ? (string) $this->backendUriBuilder->buildUriFromRoute('content_block_gui_basic_duplicate', [
                    'sourceIdentifier' => $basic->getIdentifier(),
                ]) : null,
            ];

        }
        return $list;
    }

    /**
     * @throws Exception
     */
    public function getContentBlockByName(null|array|object $parsedBody): array|AnswerInterface
    {
        if (array_key_exists('name', $parsedBody)) {
            if ($this->contentBlockRegistry->hasContentBlock($parsedBody['name'])) {
                $loadedContentBlock = $this->contentBlockRegistry->getContentBlock($parsedBody['name']);
                $contentBlockAsArray = $loadedContentBlock->toArray();
                // need to reset yaml to original data, since root-Basics are already resolved to fields here.
                $yamlPath = ExtensionManagementUtility::resolvePackagePath($loadedContentBlock->getExtPath()) . '/' . ContentBlockPathUtility::getContentBlockDefinitionFileName();
                $contentBlockAsArray['yaml'] = Yaml::parseFile($yamlPath);
                return $contentBlockAsArray;
            }
            return new ErrorContentBlockNotFoundAnswer($parsedBody['name']);
        }
        return new ErrorMissingContentBlockNameAnswer();
    }

    public function getIconsList(): AnswerInterface
    {
        $resultList = [];
        foreach ($this->tableDefinitionCollection as $tableDefinition) {
            foreach ($tableDefinition->contentTypeDefinitionCollection as $typeDefinition) {
                $resultList[$typeDefinition->getName()] = $typeDefinition->getTypeIcon()->toArray()['iconIdentifier'];
            }
        }
        return new DataAnswer(
            'iconList',
            $resultList,
        );
    }

    public function getGroupsList(): array
    {
        $languageService = $this->getLanguageService();
        $fieldConfig = $GLOBALS['TCA']['tt_content']['columns']['CType'] ?? [];
        $contentWizardGroups = $fieldConfig['config']['itemGroups'] ?? [];
        foreach ($contentWizardGroups as $key => $value) {
            $contentWizardGroups[] =  [
                'key' => $key,
                'label' => $languageService->sL($value),
            ];
            unset($contentWizardGroups[$key]);
        }
        return $contentWizardGroups;
    }

    public function getFieldTypes(): array
    {
        $resource = ExtensionManagementUtility::extPath('content_blocks_gui') . 'Configuration/ContentBlocks/FieldTypes/fieldTypes.json';
        return json_decode(file_get_contents($resource), true);
    }

    public function getBasicList(): AnswerInterface
    {
        $resultList = [];
        $this->basicsLoader->load();
        foreach ($this->basicsRegistry->getAllBasics() as $basic) {
            $resultList[$basic->getIdentifier()] = $basic->toArray();
        }
        if (empty($resultList)) {
            return new ErrorNoBasicsAvailableAnswer();
        }
        return new DataAnswer(
            'basicList',
            $resultList,
        );
    }

    public function getBasicByName(null|array|object $parsedBody): AnswerInterface
    {
        $this->basicsLoader->load();
        if (array_key_exists('identifier', $parsedBody)) {
            if ($this->basicsRegistry->hasBasic($parsedBody['identifier'])) {
                return new DataAnswer(
                    'basicList',
                    $this->basicsRegistry->getBasic($parsedBody['identifier'])->toArray(),
                );
            }
            return new ErrorBasicNotFoundAnswer($parsedBody['identifier']);
        }
        return new ErrorMissingBasicIdentifierAnswer();
    }

    public function getTranslationsByContentBlockName(null|array|object $parsedBody): AnswerInterface
    {
        if (array_key_exists('name', $parsedBody)) {
            if ($this->contentBlockRegistry->hasContentBlock($parsedBody['name'])) {
                return new DataAnswer(
                    'translations',
                    $this->languageFileRegistry->getLanguageFile($parsedBody['name']),
                );
            }
            return new ErrorContentBlockNotFoundAnswer($parsedBody['name']);
        }
        return new ErrorMissingContentBlockNameAnswer();
    }

    public function saveTranslationFile(null|array|object $parsedBody): AnswerInterface
    {
        if (array_key_exists('name', $parsedBody) && array_key_exists('targetLanguage', $parsedBody) && array_key_exists('translations', $parsedBody)) {
            if ($this->contentBlockRegistry->hasContentBlock($parsedBody['name'])) {
                $translations = $parsedBody['translations'];
                $contentBlock = $this->contentBlockRegistry->getContentBlock($parsedBody['name']);
                $languagePath = $contentBlock->getExtPath() . '/' . ContentBlockPathUtility::getLanguageFilePath();
                $absoluteLanguagePath = GeneralUtility::getFileAbsFileName($languagePath);
                $destinationFile = $absoluteLanguagePath;
                $targetLanguage = $parsedBody['targetLanguage'];
                if ($targetLanguage !== 'default') {
                    $destinationFile = str_replace('Labels.xlf', $parsedBody['targetLanguage'] . '.Labels.xlf', $absoluteLanguagePath);
                }
                if (file_exists($absoluteLanguagePath)) {
                    $originalData = file_get_contents($absoluteLanguagePath);
                    $originalXlif = new \SimpleXMLElement($originalData);
                    $newTranslation = false;
                    if (file_exists($destinationFile)) {
                        $existingDestinationData = file_get_contents($destinationFile);
                        $newTranslation = new \SimpleXMLElement($existingDestinationData);
                    } else {
                        $newTranslation = $originalXlif;
                        $newTranslation->file->addAttribute('target-language', $targetLanguage);
                    }
                    $translationLog = [];
                    for ($i = 0; $i < count($newTranslation->file->body->{"trans-unit"}); $i++) {
                        $unitAttributes = $newTranslation->file->body->{"trans-unit"}[$i]->attributes()["id"];
                        $translationLog[] = '' . $unitAttributes[0];
                        if (array_key_exists('' . $unitAttributes[0], $translations[$targetLanguage])) {
                            $newValue = $translations[$targetLanguage]['' . $unitAttributes[0]][0]['target'] ?? $translations[$targetLanguage]['' . $unitAttributes[0]][0]['source'];
                            $newTranslation->file->body->{"trans-unit"}[$i]->addChild('target', $newValue);
                        }
                    }
                    // add new values to translation file
                    $nextItemIndex = count($newTranslation->file->body->{"trans-unit"});
                    foreach ($translations[$targetLanguage] as $key => $translationItem) {
                        if (array_key_exists($key, $translationLog)) {
                            continue;
                        }
                        $newTranslation->file->body->addChild('trans-unit');
                        $newTranslation->file->body->{"trans-unit"}[$nextItemIndex]->attributes()["id"] = $key;
                        $newTranslation->file->body->{"trans-unit"}[$nextItemIndex]->attributes()["xml:space"] = "preserve";
                        if (array_key_exists('source', $translationItem[0])) {
                            $newTranslation->file->body->{"trans-unit"}[$translationItem]->addChild('target', $translationItem[0]['source']);
                        }
                        if (array_key_exists('target', $translationItem[0])) {
                            $newTranslation->file->body->{"trans-unit"}[$translationItem]->addChild('target', $translationItem[0]['target']);
                        }
                        $nextItemIndex++;
                    }

                    $newTranslation->asXML($destinationFile);
                    return new SuccessAnswer();
                }
            }
            return new ErrorContentBlockNotFoundAnswer($parsedBody['name']);
        } else {
            return new ErrorMissingContentBlockNameAnswer();
        }
    }

    protected function getLanguageService(): LanguageService
    {
        return $GLOBALS['LANG'];
    }
}
