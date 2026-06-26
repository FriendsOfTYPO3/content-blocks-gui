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

namespace FriendsOfTYPO3\ContentBlocksGui\Tests\Functional\Service;

use FriendsOfTYPO3\ContentBlocksGui\Service\ContentTypeService;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

final class ContentTypeServiceTest extends FunctionalTestCase
{
    protected array $coreExtensionsToLoad = [
        'install',
    ];

    protected array $testExtensionsToLoad = [
        'friendsoftypo3/content-blocks',
        'friendsoftypo3/content-blocks-gui',
    ];

    #[Test]
    public function getContentTypeDataSetsCorrectDefaultsForContentElement(): void
    {
        $service = $this->get(ContentTypeService::class);

        $result = $service->getContentTypeData([
            'vendor' => 'testvendor',
            'name' => 'testelement',
            'extension' => 'content_blocks_gui',
            'mode' => 'new',
            'contentType' => 'content-element',
            'contentBlock' => [],
        ]);

        self::assertSame('content-element', $result['contentType']);
        self::assertSame('tt_content', $result['contentBlock']['table']);
        self::assertTrue($result['contentBlock']['prefixFields']);
        self::assertSame('full', $result['contentBlock']['prefixType']);
        self::assertSame('CType', $result['contentBlock']['typeField']);
        self::assertSame('common', $result['contentBlock']['group']);
    }

    #[Test]
    public function getContentTypeDataSetsCorrectDefaultsForPageType(): void
    {
        $service = $this->get(ContentTypeService::class);

        $result = $service->getContentTypeData([
            'vendor' => 'testvendor',
            'name' => 'testpage',
            'extension' => 'content_blocks_gui',
            'mode' => 'new',
            'contentType' => 'page-type',
            'contentBlock' => [
                'type' => 12345,
            ],
        ]);

        self::assertSame('page-type', $result['contentType']);
        self::assertIsInt($result['contentBlock']['type']);
        self::assertSame(12345, $result['contentBlock']['type']);
        self::assertTrue($result['contentBlock']['prefixFields']);
        self::assertSame('full', $result['contentBlock']['prefixType']);
    }

    #[Test]
    public function getContentTypeDataSetsCorrectDefaultsForRecordType(): void
    {
        $service = $this->get(ContentTypeService::class);

        $result = $service->getContentTypeData([
            'vendor' => 'testvendor',
            'name' => 'testrecord',
            'extension' => 'content_blocks_gui',
            'mode' => 'new',
            'contentType' => 'record-type',
            'contentBlock' => [],
        ]);

        self::assertSame('record-type', $result['contentType']);
        self::assertSame('', $result['contentBlock']['typeName']);
        self::assertSame('', $result['contentBlock']['title']);
        self::assertIsArray($result['contentBlock']['fields']);
    }

    #[Test]
    public function getContentTypeDataPreservesCustomValues(): void
    {
        $service = $this->get(ContentTypeService::class);

        $result = $service->getContentTypeData([
            'vendor' => 'testvendor',
            'name' => 'testelement',
            'extension' => 'content_blocks_gui',
            'mode' => 'new',
            'contentType' => 'content-element',
            'contentBlock' => [
                'group' => 'special',
                'prefixType' => 'vendor',
                'prefixFields' => false,
                'priority' => 50,
            ],
        ]);

        self::assertSame('special', $result['contentBlock']['group']);
        self::assertSame('vendor', $result['contentBlock']['prefixType']);
        self::assertFalse($result['contentBlock']['prefixFields']);
        self::assertSame(50, $result['contentBlock']['priority']);
    }
}
