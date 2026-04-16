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

namespace FriendsOfTYPO3\ContentBlocksGui\Controller\Backend;

use FriendsOfTYPO3\ContentBlocksGui\Service\BasicsService;
use FriendsOfTYPO3\ContentBlocksGui\Service\FieldMetadataService;
use FriendsOfTYPO3\ContentBlocksGui\Utility\ButtonBarUtility;
use FriendsOfTYPO3\ContentBlocksGui\Utility\ContentBlocksUtility;
use FriendsOfTYPO3\ContentBlocksGui\Utility\ExtensionUtility;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Log\LoggerInterface;
use TYPO3\CMS\Backend\Attribute\AsController;
use TYPO3\CMS\Backend\Routing\Exception\RouteNotFoundException;
use TYPO3\CMS\Backend\Routing\UriBuilder;
use TYPO3\CMS\Backend\Template\ModuleTemplate;
use TYPO3\CMS\Backend\Template\ModuleTemplateFactory;
use TYPO3\CMS\Core\Cache\CacheManager;
use TYPO3\CMS\Core\Http\JsonResponse;
use TYPO3\CMS\Core\Http\RedirectResponse;
use TYPO3\CMS\Core\Imaging\IconFactory;
use TYPO3\CMS\Core\Messaging\FlashMessage;
use TYPO3\CMS\Core\Messaging\FlashMessageService;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Core\Type\ContextualFeedbackSeverity;
use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;
use TYPO3\CMS\Core\Utility\GeneralUtility;

#[AsController]
final class ContentBlocksGuiController
{
    protected ModuleTemplate $moduleTemplate;

    public function __construct(
        protected readonly ModuleTemplateFactory $moduleTemplateFactory,
        protected readonly UriBuilder $backendUriBuilder,
        protected PageRenderer $pageRenderer,
        protected ContentBlocksUtility $contentBlocksUtility,
        protected ExtensionUtility $extensionUtility,
        protected IconFactory $iconFactory,
        protected ButtonBarUtility $buttonBarUtility,
        protected readonly FlashMessageService $flashMessageService,
        protected readonly LoggerInterface $logger,
        protected readonly FieldMetadataService $fieldMetadataService,
        protected readonly BasicsService $basicsService,
        protected readonly CacheManager $cacheManager,
    ) {}

    /**
     * @throws RouteNotFoundException
     */
    public function indexAction(ServerRequestInterface $request): ResponseInterface
    {
        $this->moduleTemplate = $this->moduleTemplateFactory->create($request);
        $contentBlocks = $this->contentBlocksUtility->getAvailableContentBlocks();
        $availableExtensions = $this->extensionUtility->findAvailableExtensions();

        $this->moduleTemplate->assignMultiple([
            'contentBlocks' => $contentBlocks,
            'availableExtensions' => GeneralUtility::jsonEncodeForHtmlAttribute($availableExtensions, false),
        ]);

        // Load the list component
        $this->pageRenderer->loadJavaScriptModule('@friendsoftypo3/content-blocks-gui/list.js');
        $this->pageRenderer->addInlineLanguageLabelFile('EXT:content_blocks_gui/Resources/Private/Language/locallang.xlf');

        $this->buttonBarUtility->addIndexButtonBar($this->moduleTemplate);

        return $this->moduleTemplate->renderResponse('ContentBlocksGui/List');
    }

    /**
     * @throws RouteNotFoundException
     */
    public function editAction(ServerRequestInterface $request): ResponseInterface
    {
        $this->moduleTemplate = $this->moduleTemplateFactory->create($request);
        $this->buttonBarUtility->addEditButtonBar($this->moduleTemplate);
        $this->handleAction($request);
        return $this->moduleTemplate->renderResponse('ContentBlocksGui/Edit');
    }

    /**
     * @throws RouteNotFoundException
     */
    public function deleteAction(ServerRequestInterface $request): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        if (empty($queryParams['name'])) {
            throw new RouteNotFoundException('Missing required content block data');
        }
        $this->contentBlocksUtility->deleteContentBlock($queryParams['name']);
        return $this->redirectToList($queryParams);
    }

    /**
     * @throws RouteNotFoundException
     */
    public function deleteBasicAction(ServerRequestInterface $request): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        if (empty($queryParams['identifier'])) {
            throw new RouteNotFoundException('Missing required basic identifier');
        }

        try {
            $this->contentBlocksUtility->deleteBasic($queryParams['identifier']);
            $this->addFlashMessage(
                sprintf('Basic "%s" has been successfully deleted.', $queryParams['identifier']),
                'Basic Deleted',
                ContextualFeedbackSeverity::OK,
            );
        } catch (\Exception $e) {
            $this->addFlashMessage(
                sprintf('Failed to delete basic: %s', $e->getMessage()),
                'Deletion Failed',
                ContextualFeedbackSeverity::ERROR,
            );
            $this->logger->error('Failed to delete basic', [
                'identifier' => $queryParams['identifier'],
                'error' => $e->getMessage(),
            ]);
        }

        return $this->redirectToList($queryParams);
    }

    /**
     * @throws RouteNotFoundException
     */
    public function duplicateAction(ServerRequestInterface $request): ResponseInterface
    {
        $queryParams = $request->getQueryParams();

        // Validate required parameters
        if (empty($queryParams['sourceName']) || empty($queryParams['targetExtension'])
            || empty($queryParams['targetVendor']) || empty($queryParams['targetName'])) {
            throw new RouteNotFoundException('Missing required parameters for duplication');
        }

        $sourceName = $queryParams['sourceName'];
        $targetExtension = $queryParams['targetExtension'];
        $targetVendor = $queryParams['targetVendor'];
        $targetName = $queryParams['targetName'];

        // Optional RecordType duplication parameters
        $duplicationStrategy = $queryParams['duplicationStrategy'] ?? 'auto';
        $customTypeName = $queryParams['customTypeName'] ?? null;
        $customTableName = $queryParams['customTableName'] ?? null;

        try {
            $this->contentBlocksUtility->duplicateContentBlock(
                $sourceName,
                $targetExtension,
                $targetVendor,
                $targetName,
                $duplicationStrategy,
                $customTypeName,
                $customTableName,
            );
            $this->addFlashMessage(
                sprintf('Content block "%s" has been successfully duplicated to "%s/%s".', $sourceName, $targetVendor, $targetName),
                'Content Block Duplicated',
                ContextualFeedbackSeverity::OK,
            );
        } catch (\RuntimeException $e) {
            $this->addFlashMessage($e->getMessage(), 'Duplication Failed', ContextualFeedbackSeverity::ERROR);
        } catch (\Exception $e) {
            $this->logger->error('Unexpected error during content block duplication', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            $this->addFlashMessage(
                'An unexpected error occurred during duplication. Please check the logs for details.',
                'Duplication Failed',
                ContextualFeedbackSeverity::ERROR,
            );
        }

        return $this->redirectToList($queryParams);
    }

    /**
     * @throws RouteNotFoundException
     */
    protected function handleAction(ServerRequestInterface $request): void
    {
        $this->pageRenderer->loadJavaScriptModule('@friendsoftypo3/content-blocks-gui/editor.js');
        $queryParams = $request->getQueryParams();
        if (!isset($queryParams['name'])) {
            throw new RouteNotFoundException('Missing required content block name');
        }
        $mode = basename($request->getUri()->getPath());
        $contentType = $queryParams['contentType'] ?? 'content-element';
        switch ($mode) {
            case 'new':
                $skeletonJson = file_get_contents(ExtensionManagementUtility::extPath('content_blocks_gui') . 'Configuration/ContentBlocks/Skeleton.json');
                $contentBlocksData = json_decode($skeletonJson, true);
                // Set type-specific defaults. The skeleton is CE-oriented,
                // so other types need their own table/typeField/prefixFields.
                if ($contentType === 'page-type') {
                    $contentBlocksData['yaml']['table'] = 'pages';
                    $contentBlocksData['yaml']['typeField'] = 'doktype';
                } elseif ($contentType === 'record-type') {
                    // Record Types use a custom table (auto-generated by ConfigBuilder).
                    // Remove CE-specific defaults so they don't override ConfigBuilder.
                    unset(
                        $contentBlocksData['yaml']['table'],
                        $contentBlocksData['yaml']['typeField'],
                        $contentBlocksData['yaml']['typeName'],
                        $contentBlocksData['yaml']['description'],
                        $contentBlocksData['yaml']['group'],
                    );
                    $contentBlocksData['yaml']['prefixFields'] = false;
                }
                break;
            case 'edit':
                $contentBlocksData = $this->contentBlocksUtility->getContentBlockByName($queryParams);
                break;
            case 'duplicate':
                $contentBlocksData = $this->contentBlocksUtility->getContentBlockByName($queryParams);
                break;
            default:
                throw new RouteNotFoundException('Invalid request mode: ' . $mode);
        }
        // Get table for field metadata
        $table = $contentBlocksData['yaml']['table'] ?? 'tt_content';
        $fieldMetadata = $this->fieldMetadataService->getFieldMetadata($table);

        $contentBlockEditorData = GeneralUtility::implodeAttributes([
            'mode' => $mode,
            'contenttype' => $contentType,
            'data' => GeneralUtility::jsonEncodeForHtmlAttribute($contentBlocksData, false),
            'extensions' => GeneralUtility::jsonEncodeForHtmlAttribute($this->extensionUtility->findAvailableExtensions(), false),
            'groups' => GeneralUtility::jsonEncodeForHtmlAttribute($this->contentBlocksUtility->getGroupsList(), false),
            'fieldconfig' => GeneralUtility::jsonEncodeForHtmlAttribute($this->contentBlocksUtility->getFieldTypes(), false),
            'fieldmetadata' => GeneralUtility::jsonEncodeForHtmlAttribute($fieldMetadata, false),
        ], true);

        $this->moduleTemplate->assignMultiple([
            'contentBlockEditorData' => $contentBlockEditorData,
        ]);
    }

    /**
     * @throws RouteNotFoundException
     */
    public function editBasicAction(ServerRequestInterface $request): ResponseInterface
    {
        $this->moduleTemplate = $this->moduleTemplateFactory->create($request);
        $this->buttonBarUtility->addEditButtonBar($this->moduleTemplate);
        $this->handleBasicAction($request);
        return $this->moduleTemplate->renderResponse('ContentBlocksGui/EditBasic');
    }

    /**
     * @throws RouteNotFoundException
     */
    public function duplicateBasicAction(ServerRequestInterface $request): ResponseInterface
    {
        $queryParams = $request->getQueryParams();

        // Validate required parameters
        if (empty($queryParams['sourceIdentifier']) || empty($queryParams['targetExtension'])
            || empty($queryParams['targetIdentifier'])) {
            throw new RouteNotFoundException('Missing required parameters for basic duplication');
        }

        $sourceIdentifier = $queryParams['sourceIdentifier'];
        $targetExtension = $queryParams['targetExtension'];
        $targetIdentifier = $queryParams['targetIdentifier'];

        try {
            $this->contentBlocksUtility->duplicateBasic(
                $sourceIdentifier,
                $targetExtension,
                $targetIdentifier,
            );
            $this->addFlashMessage(
                sprintf('Basic "%s" has been successfully duplicated to "%s".', $sourceIdentifier, $targetIdentifier),
                'Basic Duplicated',
                ContextualFeedbackSeverity::OK,
            );
        } catch (\RuntimeException $e) {
            $this->addFlashMessage($e->getMessage(), 'Basic Duplication Failed', ContextualFeedbackSeverity::ERROR);
        } catch (\Exception $e) {
            $this->logger->error('Unexpected error during basic duplication', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            $this->addFlashMessage(
                'An unexpected error occurred during duplication. Please check the logs for details.',
                'Basic Duplication Failed',
                ContextualFeedbackSeverity::ERROR,
            );
        }

        return $this->redirectToList($queryParams);
    }

    /**
     * @throws RouteNotFoundException
     */
    protected function handleBasicAction(ServerRequestInterface $request): void
    {
        $this->pageRenderer->loadJavaScriptModule('@friendsoftypo3/content-blocks-gui/editor.js');
        $queryParams = $request->getQueryParams();
        $mode = basename($request->getUri()->getPath());

        switch ($mode) {
            case 'new':
                $skeletonJson = file_get_contents(ExtensionManagementUtility::extPath('content_blocks_gui') . 'Configuration/ContentBlocks/BasicSkeleton.json');
                $contentBlocksData = json_decode($skeletonJson, true);
                break;
            case 'edit':
                if (empty($queryParams['identifier'])) {
                    throw new RouteNotFoundException('Missing required basic identifier');
                }
                try {
                    $basicData = $this->basicsService->loadBasicForEditor($queryParams['identifier']);
                    $contentBlocksData = [
                        'name' => $basicData['identifier'],
                        'yaml' => $basicData,
                        'hostExtension' => $basicData['hostExtension'],
                        'extPath' => '',
                    ];
                } catch (\Exception $e) {
                    throw new RouteNotFoundException('Basic not found: ' . $queryParams['identifier'] . ' - ' . $e->getMessage());
                }
                break;
            default:
                throw new RouteNotFoundException('Invalid request mode: ' . $mode);
        }

        // Basics don't have a table context, use tt_content as default for field metadata
        $table = 'tt_content';
        $fieldMetadata = $this->fieldMetadataService->getFieldMetadata($table);

        $contentBlockEditorData = GeneralUtility::implodeAttributes([
            'mode' => $mode,
            'contenttype' => 'basic',
            'data' => GeneralUtility::jsonEncodeForHtmlAttribute($contentBlocksData, false),
            'extensions' => GeneralUtility::jsonEncodeForHtmlAttribute($this->extensionUtility->findAvailableExtensions(), false),
            'groups' => GeneralUtility::jsonEncodeForHtmlAttribute($this->contentBlocksUtility->getGroupsList(), false),
            'fieldconfig' => GeneralUtility::jsonEncodeForHtmlAttribute($this->contentBlocksUtility->getFieldTypes(), false),
            'fieldmetadata' => GeneralUtility::jsonEncodeForHtmlAttribute($fieldMetadata, false),
        ], true);

        $this->moduleTemplate->assignMultiple([
            'contentBlockEditorData' => $contentBlockEditorData,
        ]);
    }

    /**
     * API endpoint: List all available Basics
     *
     * @param ServerRequestInterface $request
     * @return ResponseInterface JSON response with list of Basics
     */
    public function listBasicsApiAction(ServerRequestInterface $request): ResponseInterface
    {
        try {
            $basics = $this->basicsService->listBasics();
            return new JsonResponse([
                'success' => true,
                'data' => $basics,
            ]);
        } catch (\Exception $e) {
            $this->logger->error('Failed to list basics', [
                'error' => $e->getMessage(),
            ]);
            return new JsonResponse([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * API endpoint: Load a specific Basic
     *
     * @param ServerRequestInterface $request
     * @return ResponseInterface JSON response with Basic data
     */
    public function loadBasicApiAction(ServerRequestInterface $request): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        $identifier = $queryParams['identifier'] ?? '';

        if (empty($identifier)) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Missing identifier parameter',
            ], 400);
        }

        try {
            $basic = $this->basicsService->loadBasic($identifier);
            return new JsonResponse([
                'success' => true,
                'data' => $basic,
            ]);
        } catch (\RuntimeException $e) {
            return new JsonResponse([
                'success' => false,
                'error' => $e->getMessage(),
            ], 404);
        } catch (\Exception $e) {
            $this->logger->error('Failed to load basic', [
                'identifier' => $identifier,
                'error' => $e->getMessage(),
            ]);
            return new JsonResponse([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * API endpoint: Save a Basic
     *
     * @param ServerRequestInterface $request
     * @return ResponseInterface JSON response
     */
    public function saveBasicApiAction(ServerRequestInterface $request): ResponseInterface
    {
        $body = $request->getParsedBody();

        $mode = $body['mode'] ?? 'new';  // 'new' or 'edit'
        $extension = $body['extension'] ?? '';
        $vendor = $body['vendor'] ?? '';
        $name = $body['name'] ?? '';

        // Fields are sent as JSON string in FormData
        $fields = [];
        if (isset($body['fields'])) {
            $fields = is_string($body['fields']) ? json_decode($body['fields'], true) : $body['fields'];
        }

        if (empty($extension) || empty($vendor) || empty($name)) {
            $flashMessage = GeneralUtility::makeInstance(
                FlashMessage::class,
                'Missing required parameters: extension, vendor, or name',
                'Validation Error',
                ContextualFeedbackSeverity::ERROR,
                true,
            );
            $this->flashMessageService->getMessageQueueByIdentifier()->enqueue($flashMessage);

            return new RedirectResponse(
                (string) $this->backendUriBuilder->buildUriFromRoute('web_ContentBlocksGui', ['type' => 'basic']),
                303,
            );
        }

        $identifier = $vendor . '/' . $name;

        try {
            // Use comprehensive save method that handles both create and update
            $result = $this->basicsService->saveBasicFromGui($mode, $extension, $identifier, $fields);

            if (!$result['success']) {
                $flashMessage = GeneralUtility::makeInstance(
                    FlashMessage::class,
                    $result['message'] ?? 'Failed to save Basic', // @phpstan-ignore nullCoalesce.offset
                    'Error',
                    ContextualFeedbackSeverity::ERROR,
                    true,
                );
                $this->flashMessageService->getMessageQueueByIdentifier()->enqueue($flashMessage);
            } else {
                $this->cacheManager->flushCachesInGroup('system');
                $this->cacheManager->getCache('typoscript')->flush();

                $flashMessage = GeneralUtility::makeInstance(
                    FlashMessage::class,
                    $result['message'] ?? 'Basic saved successfully', // @phpstan-ignore nullCoalesce.offset
                    'Success',
                    ContextualFeedbackSeverity::OK,
                    true,
                );
                $this->flashMessageService->getMessageQueueByIdentifier()->enqueue($flashMessage);
            }

            // Redirect to list view with basics tab active
            return new RedirectResponse(
                (string) $this->backendUriBuilder->buildUriFromRoute('web_ContentBlocksGui', ['type' => 'basic']),
                303,
            );
        } catch (\Exception $e) {
            $this->logger->error('Failed to save basic', [
                'mode' => $mode,
                'extension' => $extension,
                'identifier' => $identifier,
                'error' => $e->getMessage(),
            ]);

            $flashMessage = GeneralUtility::makeInstance(
                FlashMessage::class,
                $e->getMessage(),
                'Error',
                ContextualFeedbackSeverity::ERROR,
                true,
            );
            $this->flashMessageService->getMessageQueueByIdentifier()->enqueue($flashMessage);

            return new RedirectResponse(
                (string) $this->backendUriBuilder->buildUriFromRoute('web_ContentBlocksGui', ['type' => 'basic']),
                303,
            );
        }
    }

    /**
     * Save Content Block and redirect to list with flash message
     *
     * @param ServerRequestInterface $request
     * @return ResponseInterface Redirect response
     */
    public function saveContentBlockAndCloseAction(ServerRequestInterface $request): ResponseInterface
    {
        $body = $request->getParsedBody();

        $contentType = $body['contentType'] ?? 'content-element';
        $extension = $body['extension'] ?? '';
        $mode = $body['mode'] ?? 'edit';
        $name = $body['name'] ?? '';
        $vendor = $body['vendor'] ?? '';

        // ContentBlock data is sent as JSON string
        $contentBlock = [];
        if (isset($body['contentBlock'])) {
            $contentBlock = is_string($body['contentBlock']) ? json_decode($body['contentBlock'], true) : $body['contentBlock'];
        }

        if (empty($extension) || empty($name) || empty($vendor)) {
            $flashMessage = GeneralUtility::makeInstance(
                FlashMessage::class,
                'Missing required parameters: extension or name',
                'Validation Error',
                ContextualFeedbackSeverity::ERROR,
                true,
            );
            $this->flashMessageService->getMessageQueueByIdentifier()->enqueue($flashMessage);

            return new RedirectResponse(
                (string) $this->backendUriBuilder->buildUriFromRoute('web_ContentBlocksGui', ['type' => 'content-element']),
                303,
            );
        }

        try {
            // Use ContentBlocksUtility to save the content block
            $saveData = [
                'contentType' => $contentType,
                'extension' => $extension,
                'mode' => $mode,
                'name' => $name,
                'vendor' => $vendor,
                'contentBlock' => $contentBlock,
            ];

            $result = $this->contentBlocksUtility->saveContentType($saveData);

            // Check if save was successful
            if ($result->isSuccess()) {
                $this->cacheManager->flushCachesInGroup('system');
                $this->cacheManager->getCache('typoscript')->flush();

                $flashMessage = GeneralUtility::makeInstance(
                    FlashMessage::class,
                    'Content Block saved successfully',
                    'Success',
                    ContextualFeedbackSeverity::OK,
                    true,
                );
                $this->flashMessageService->getMessageQueueByIdentifier()->enqueue($flashMessage);
            } else {
                $flashMessage = GeneralUtility::makeInstance(
                    FlashMessage::class,
                    'Failed to save Content Block',
                    'Error',
                    ContextualFeedbackSeverity::ERROR,
                    true,
                );
                $this->flashMessageService->getMessageQueueByIdentifier()->enqueue($flashMessage);
            }

            // Redirect to list view with content-element tab active
            return new RedirectResponse(
                (string) $this->backendUriBuilder->buildUriFromRoute('web_ContentBlocksGui', ['type' => 'content-element']),
                303,
            );
        } catch (\Exception $e) {
            $this->logger->error('Failed to save content block', [
                'mode' => $mode,
                'extension' => $extension,
                'name' => $name,
                'error' => $e->getMessage(),
            ]);

            $flashMessage = GeneralUtility::makeInstance(
                FlashMessage::class,
                $e->getMessage(),
                'Error',
                ContextualFeedbackSeverity::ERROR,
                true,
            );
            $this->flashMessageService->getMessageQueueByIdentifier()->enqueue($flashMessage);

            return new RedirectResponse(
                (string) $this->backendUriBuilder->buildUriFromRoute('web_ContentBlocksGui', ['type' => 'content-element']),
                303,
            );
        }
    }

    /**
     * API endpoint: Validate a Basic (primarily for loop detection)
     *
     * @param ServerRequestInterface $request
     * @return ResponseInterface JSON response with validation result
     */
    public function validateBasicApiAction(ServerRequestInterface $request): ResponseInterface
    {
        $body = $request->getParsedBody();

        $identifier = $body['identifier'] ?? '';
        $fields = $body['fields'] ?? [];

        if (empty($identifier)) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Missing identifier parameter',
            ], 400);
        }

        try {
            $result = $this->basicsService->validateBasic($identifier, $fields);
            return new JsonResponse([
                'success' => true,
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            $this->logger->error('Failed to validate basic', [
                'identifier' => $identifier,
                'error' => $e->getMessage(),
            ]);
            return new JsonResponse([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Build a redirect response to the list view, preserving the active tab
     */
    private function redirectToList(array $queryParams, array $extraParams = []): RedirectResponse
    {
        $redirectParams = $extraParams;
        if (!empty($queryParams['returnTab'])) {
            $redirectParams['type'] = $queryParams['returnTab'];
        }
        return new RedirectResponse(
            (string) $this->backendUriBuilder->buildUriFromRoute('web_ContentBlocksGui', $redirectParams),
            303,
        );
    }

    /**
     * Add a flash message to the queue
     */
    private function addFlashMessage(string $message, string $title, ContextualFeedbackSeverity $severity): void
    {
        $flashMessage = GeneralUtility::makeInstance(
            FlashMessage::class,
            $message,
            $title,
            $severity,
            true,
        );
        $this->flashMessageService->getMessageQueueByIdentifier()->enqueue($flashMessage);
    }

    /**
     * API endpoint: Get Content Blocks that use a specific Basic
     *
     * @param ServerRequestInterface $request
     * @return ResponseInterface JSON response with list of Content Blocks
     */
    public function getBasicUsageApiAction(ServerRequestInterface $request): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        $identifier = $queryParams['identifier'] ?? '';

        if (empty($identifier)) {
            return new JsonResponse([
                'success' => false,
                'error' => 'Missing identifier parameter',
            ], 400);
        }

        try {
            $usedBy = $this->basicsService->getUsedBy($identifier);
            return new JsonResponse([
                'success' => true,
                'data' => [
                    'identifier' => $identifier,
                    'usedBy' => $usedBy,
                    'usageCount' => count($usedBy),
                ],
            ]);
        } catch (\Exception $e) {
            $this->logger->error('Failed to get basic usage', [
                'identifier' => $identifier,
                'error' => $e->getMessage(),
            ]);
            return new JsonResponse([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
