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

use FriendsOfTYPO3\ContentBlocksGui\Service\BasicsService;
use PHPUnit\Framework\Attributes\Test;
use TYPO3\TestingFramework\Core\Functional\FunctionalTestCase;

final class BasicsServiceTest extends FunctionalTestCase
{
    protected array $coreExtensionsToLoad = [
        'install',
    ];

    protected array $testExtensionsToLoad = [
        'friendsoftypo3/content-blocks',
        'friendsoftypo3/content-blocks-gui',
    ];

    #[Test]
    public function listBasicsReturnsArray(): void
    {
        $service = $this->get(BasicsService::class);

        self::assertInstanceOf(BasicsService::class, $service);

        $result = $service->listBasics();

        self::assertIsArray($result);
    }

    #[Test]
    public function loadBasicThrowsForUnknownIdentifier(): void
    {
        $service = $this->get(BasicsService::class);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionCode(1734000001);

        $service->loadBasic('NonExistent/BasicIdentifier');
    }

    #[Test]
    public function parseIdentifierThrowsForInvalidFormat(): void
    {
        $service = $this->get(BasicsService::class);

        $reflection = new \ReflectionMethod($service, 'parseIdentifier');

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionCode(1734000010);

        $reflection->invoke($service, 'invalid');
    }

    #[Test]
    public function parseIdentifierSplitsCorrectly(): void
    {
        $service = $this->get(BasicsService::class);

        $reflection = new \ReflectionMethod($service, 'parseIdentifier');

        $result = $reflection->invoke($service, 'vendor/name');

        self::assertSame(['vendor', 'name'], $result);
    }
}
