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

namespace FriendsOfTYPO3\ContentBlocksGui\Tests\Unit\Service;

use FriendsOfTYPO3\ContentBlocksGui\Service\FieldCleanupTrait;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\TestingFramework\Core\Unit\UnitTestCase;

final class FieldCleanupTraitTest extends UnitTestCase
{
    private object $subject;

    protected function setUp(): void
    {
        parent::setUp();

        $this->subject = new class {
            use FieldCleanupTrait;

            public function clean(mixed $data): mixed
            {
                return $this->cleanFieldsForSave($data);
            }
        };
    }

    public static function integerPropertiesDataProvider(): iterable
    {
        yield 'maxitems string becomes integer' => [
            ['identifier' => 'images', 'type' => 'File', 'maxitems' => '2'],
            ['identifier' => 'images', 'type' => 'File', 'maxitems' => 2],
        ];
        yield 'minitems string becomes integer' => [
            ['identifier' => 'images', 'type' => 'File', 'minitems' => '1'],
            ['identifier' => 'images', 'type' => 'File', 'minitems' => 1],
        ];
        yield 'integer stays integer' => [
            ['identifier' => 'images', 'type' => 'File', 'maxitems' => 3],
            ['identifier' => 'images', 'type' => 'File', 'maxitems' => 3],
        ];
        yield 'empty integer property is dropped' => [
            ['identifier' => 'images', 'type' => 'File', 'maxitems' => ''],
            ['identifier' => 'images', 'type' => 'File'],
        ];
        yield 'size, min, max, rows, cols, dbFieldLength and version are cast' => [
            ['size' => '20', 'min' => '0', 'max' => '255', 'rows' => '5', 'cols' => '40', 'dbFieldLength' => '255', 'version' => '4'],
            ['size' => 20, 'min' => 0, 'max' => 255, 'rows' => 5, 'cols' => 40, 'dbFieldLength' => 255, 'version' => 4],
        ];
        yield 'non-numeric value is kept untouched' => [
            ['identifier' => 'images', 'type' => 'File', 'maxitems' => 'many'],
            ['identifier' => 'images', 'type' => 'File', 'maxitems' => 'many'],
        ];
        yield 'nested collection fields are cast as well' => [
            ['identifier' => 'slides', 'type' => 'Collection', 'maxitems' => '10', 'fields' => [
                ['identifier' => 'image', 'type' => 'File', 'maxitems' => '1'],
            ]],
            ['identifier' => 'slides', 'type' => 'Collection', 'maxitems' => 10, 'fields' => [
                ['identifier' => 'image', 'type' => 'File', 'maxitems' => 1],
            ]],
        ];
    }

    #[Test]
    #[DataProvider('integerPropertiesDataProvider')]
    public function integerPropertiesAreCast(array $input, array $expected): void
    {
        self::assertSame($expected, $this->subject->clean($input));
    }

    public static function defaultPropertyDataProvider(): iterable
    {
        yield 'Number field default becomes integer' => [
            ['identifier' => 'amount', 'type' => 'Number', 'default' => '5'],
            ['identifier' => 'amount', 'type' => 'Number', 'default' => 5],
        ];
        yield 'Number field decimal default becomes float' => [
            ['identifier' => 'price', 'type' => 'Number', 'format' => 'decimal', 'default' => '9.5'],
            ['identifier' => 'price', 'type' => 'Number', 'format' => 'decimal', 'default' => 9.5],
        ];
        yield 'Text field numeric default stays string' => [
            ['identifier' => 'code', 'type' => 'Text', 'default' => '0815'],
            ['identifier' => 'code', 'type' => 'Text', 'default' => '0815'],
        ];
        yield 'Number field non-numeric default is kept untouched' => [
            ['identifier' => 'amount', 'type' => 'Number', 'default' => ''],
            ['identifier' => 'amount', 'type' => 'Number', 'default' => ''],
        ];
    }

    #[Test]
    #[DataProvider('defaultPropertyDataProvider')]
    public function defaultPropertyIsCastForNumberFieldsOnly(array $input, array $expected): void
    {
        self::assertSame($expected, $this->subject->clean($input));
    }

    #[Test]
    public function booleanPropertiesAreStillCast(): void
    {
        $result = $this->subject->clean(['identifier' => 'header', 'useExistingField' => 'true', 'required' => '0']);

        self::assertSame(['identifier' => 'header', 'useExistingField' => true, 'required' => false], $result);
    }
}
