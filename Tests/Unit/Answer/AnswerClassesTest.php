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

namespace FriendsOfTYPO3\ContentBlocksGui\Tests\Unit\Answer;

use FriendsOfTYPO3\ContentBlocksGui\Answer\DataAnswer;
use FriendsOfTYPO3\ContentBlocksGui\Answer\ErrorContentBlockNotFoundAnswer;
use FriendsOfTYPO3\ContentBlocksGui\Answer\ErrorMissingBasicIdentifierAnswer;
use FriendsOfTYPO3\ContentBlocksGui\Answer\ErrorSaveContentTypeAnswer;
use FriendsOfTYPO3\ContentBlocksGui\Answer\SuccessAnswer;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\TestingFramework\Core\Unit\UnitTestCase;

final class AnswerClassesTest extends UnitTestCase
{
    #[Test]
    public function successAnswerIsSuccess(): void
    {
        $answer = new SuccessAnswer();

        self::assertTrue($answer->isSuccess());
    }

    #[Test]
    public function successAnswerResponseContainsSuccessTrue(): void
    {
        $answer = new SuccessAnswer();
        $response = $answer->getResponse();

        $decoded = json_decode(
            $response->getBody()->getContents(),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        self::assertTrue($decoded['success']);
    }

    #[Test]
    public function errorContentBlockNotFoundContainsName(): void
    {
        $answer = new ErrorContentBlockNotFoundAnswer('vendor/my-block');
        $response = $answer->getResponse();

        $decoded = json_decode(
            $response->getBody()->getContents(),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        self::assertStringContainsString('vendor/my-block', $decoded['message']);
    }

    #[Test]
    public function errorContentBlockNotFoundIsNotSuccess(): void
    {
        $answer = new ErrorContentBlockNotFoundAnswer('vendor/my-block');

        self::assertFalse($answer->isSuccess());
    }

    #[Test]
    public function errorMissingBasicIdentifierHasMessage(): void
    {
        $answer = new ErrorMissingBasicIdentifierAnswer();
        $response = $answer->getResponse();

        $decoded = json_decode(
            $response->getBody()->getContents(),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        self::assertSame('No Basic identifier given.', $decoded['message']);
    }

    #[Test]
    public function dataAnswerContainsBodyData(): void
    {
        $data = ['field1' => 'value1', 'field2' => 'value2'];
        $answer = new DataAnswer('contentBlocks', $data);
        $response = $answer->getResponse();

        $decoded = json_decode(
            $response->getBody()->getContents(),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        self::assertSame($data, $decoded['body']['contentBlocks']);
    }

    #[Test]
    public function dataAnswerIsSuccess(): void
    {
        $answer = new DataAnswer('items', ['foo' => 'bar']);

        self::assertTrue($answer->isSuccess());
    }

    #[Test]
    public function errorSaveContentTypeContainsMessage(): void
    {
        $answer = new ErrorSaveContentTypeAnswer('YAML syntax error');
        $response = $answer->getResponse();

        $decoded = json_decode(
            $response->getBody()->getContents(),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        self::assertStringContainsString('YAML syntax error', $decoded['message']);
    }

    #[Test]
    public function addToBodyAppendsData(): void
    {
        $answer = new SuccessAnswer();
        $answer->addToBody('first', ['a' => 1]);
        $answer->addToBody('second', ['b' => 2]);

        $response = $answer->getResponse();
        $decoded = json_decode(
            $response->getBody()->getContents(),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        self::assertSame(['a' => 1], $decoded['body']['first']);
        self::assertSame(['b' => 2], $decoded['body']['second']);
    }

    #[Test]
    public function getMessageReturnsReasonOfFailedSave(): void
    {
        $answer = new ErrorSaveContentTypeAnswer('Content Block name "Foo" does not match requirements.');

        self::assertStringContainsString(
            'Content Block name "Foo" does not match requirements.',
            $answer->getMessage(),
        );
    }

    #[Test]
    public function getMessageIsEmptyForSuccessAnswer(): void
    {
        $answer = new SuccessAnswer();

        self::assertSame('', $answer->getMessage());
    }
}
