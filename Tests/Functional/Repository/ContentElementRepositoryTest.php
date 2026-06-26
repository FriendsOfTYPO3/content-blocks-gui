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

namespace FriendsOfTYPO3\ContentBlocksGui\Tests\Functional\Repository;

use FriendsOfTYPO3\ContentBlocksGui\Domain\Repository\ContentElementRepository;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\ContentBlocks\Definition\ContentType\ContentType;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

final class ContentElementRepositoryTest extends FunctionalTestCase
{
    protected array $coreExtensionsToLoad = [
        'install',
    ];

    protected array $testExtensionsToLoad = [
        'friendsoftypo3/content-blocks',
        'friendsoftypo3/content-blocks-gui',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/tt_content.csv');
    }

    #[Test]
    public function countUsagesReturnsCorrectCount(): void
    {
        $repository = $this->get(ContentElementRepository::class);

        $count = $repository->countUsages(
            'testvendor_testelement',
            ContentType::CONTENT_ELEMENT,
            'tt_content',
        );

        self::assertSame(2, $count);
    }

    #[Test]
    public function countUsagesReturnsZeroForUnknownType(): void
    {
        $repository = $this->get(ContentElementRepository::class);

        $count = $repository->countUsages(
            'nonexistent_type',
            ContentType::CONTENT_ELEMENT,
            'tt_content',
        );

        self::assertSame(0, $count);
    }

    #[Test]
    public function countUsagesIncludesHiddenRecords(): void
    {
        $repository = $this->get(ContentElementRepository::class);

        // uid 1 (visible) + uid 2 (hidden) = 2, uid 3 (deleted) is excluded
        $count = $repository->countUsages(
            'testvendor_testelement',
            ContentType::CONTENT_ELEMENT,
            'tt_content',
        );

        // If hidden records were excluded, count would be 1 (only uid 1)
        self::assertGreaterThan(1, $count);
        self::assertSame(2, $count);
    }
}
