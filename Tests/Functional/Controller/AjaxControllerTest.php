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

namespace FriendsOfTYPO3\ContentBlocksGui\Tests\Functional\Controller;

use FriendsOfTYPO3\ContentBlocksGui\Controller\Backend\AjaxController;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\CMS\Core\Http\ServerRequest;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

final class AjaxControllerTest extends FunctionalTestCase
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
        $this->importCSVDataSet(__DIR__ . '/../Fixtures/be_users.csv');
        $this->setUpBackendUser(1);
    }

    #[Test]
    public function saveBasicAjaxReturns400OnMissingParams(): void
    {
        $controller = $this->get(AjaxController::class);

        $request = new ServerRequest('https://example.com/test', 'POST');
        $request = $request->withParsedBody([]);

        $response = $controller->saveBasicAjaxAction($request);

        self::assertSame(400, $response->getStatusCode());

        $body = json_decode((string) $response->getBody(), true);
        self::assertFalse($body['success']);
    }

    #[Test]
    public function downloadBasicReturns400OnMissingIdentifier(): void
    {
        $controller = $this->get(AjaxController::class);

        $stream = new \TYPO3\CMS\Core\Http\Stream('php://temp', 'rw');
        $stream->write(json_encode([]));
        $stream->rewind();
        $request = new ServerRequest('https://example.com/test', 'POST');
        $request = $request->withBody($stream);

        $response = $controller->downloadBasicAction($request);

        self::assertSame(400, $response->getStatusCode());

        $responseBody = json_decode((string) $response->getBody(), true);
        self::assertArrayHasKey('error', $responseBody);
        self::assertSame('Missing identifier parameter', $responseBody['error']);
    }
}
