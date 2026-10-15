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

namespace FriendsOfTYPO3\ContentBlocksGui\Tests\Unit\Utility;

use FriendsOfTYPO3\ContentBlocksGui\Utility\YamlTagUtility;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\TestingFramework\Core\Unit\UnitTestCase;

final class YamlTagUtilityTest extends UnitTestCase
{
    public static function yamlWithTagsDataProvider(): \Generator
    {
        yield 'php/const as default' => ["default: !php/const Acme\\Constants::FOO\n"];
        yield 'php/const as list item value' => ["items:\n  - value: !php/const Acme\\Constants::FOO\n"];
        yield 'php/const as bare list item' => ["items:\n  - !php/const Acme\\Constants::FOO\n"];
        yield 'custom tag' => ["default: !my_tag something\n"];
        yield 'double-bang tag' => ["data: !!binary abc\n"];
    }

    #[Test]
    #[DataProvider('yamlWithTagsDataProvider')]
    public function detectsTags(string $yaml): void
    {
        self::assertTrue(YamlTagUtility::containsTags($yaml));
    }

    public static function yamlWithoutTagsDataProvider(): \Generator
    {
        yield 'plain config' => ["name: acme/foo\nfields:\n  -\n    identifier: text\n    type: Text\n"];
        yield 'exclamation mark in quoted label' => ["label: 'Hello!'\n"];
        yield 'exclamation mark inside text' => ["description: Wow! Great stuff\n"];
        yield 'not-equal display condition' => ["displayCond: 'FIELD:type:!=:1'\n"];
        yield 'empty' => [''];
    }

    #[Test]
    #[DataProvider('yamlWithoutTagsDataProvider')]
    public function ignoresTextWithoutTags(string $yaml): void
    {
        self::assertFalse(YamlTagUtility::containsTags($yaml));
    }

    #[Test]
    public function missingFileHasNoTags(): void
    {
        self::assertFalse(YamlTagUtility::fileContainsTags('/does/not/exist/config.yaml'));
    }
}
