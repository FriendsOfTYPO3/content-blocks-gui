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

use TYPO3\CMS\ContentBlocks\Service\PackageResolver;
use TYPO3\CMS\Core\Utility\PathUtility;

class ExtensionUtility
{
    public function __construct(
        protected PackageResolver $packageResolver,
    ) {}

    /**
     * Get available extensions for content blocks.
     * Uses the native Content Blocks PackageResolver to get packages filtered for display.
     * This ensures consistency with the Content Blocks core command.
     */
    public function findAvailableExtensions(): array
    {
        $availablePackages = $this->packageResolver->getAvailablePackagesForDisplay();
        $availableExtensions = [];

        foreach ($availablePackages as $packageKey => $package) {
            // Skip protected packages
            if ($package->isProtected()) {
                continue;
            }

            $composerName = $package->getValueFromComposerManifest('name');
            if (!$composerName) {
                continue;
            }

            $nameParts = explode('/', $composerName);
            if (count($nameParts) !== 2) {
                continue;
            }

            [$vendor, $packageName] = $nameParts;

            // Skip the content-blocks-gui extension itself
            if ($vendor === 'friendsoftypo3' && $packageName === 'content-blocks-gui') {
                continue;
            }

            // Read composer.json directly from disk instead of relying on
            // PackageInterface::getValueFromComposerManifest('require'). In
            // legacy (non-composer) mode TYPO3 core overwrites the require
            // section with data mapped from ext_emconf.php (using extkeys
            // like "content_blocks" instead of composer names like
            // "friendsoftypo3/content-blocks"), which would make this filter
            // miss valid host extensions. Reading composer.json directly is
            // mode-agnostic and matches user expectation.
            $composerJsonPath = $package->getPackagePath() . 'composer.json';
            if (!is_file($composerJsonPath)) {
                continue;
            }
            $manifest = json_decode((string)file_get_contents($composerJsonPath), true);
            if (!is_array($manifest)) {
                continue;
            }
            $requiredPackages = $manifest['require'] ?? [];
            if (!isset($requiredPackages['friendsoftypo3/content-blocks'])) {
                continue;
            }

            $availableExtensions[] = [
                'vendor' => $vendor,
                'package' => $nameParts[1], // Use the package name part
                'extension' => $packageKey,
                'icon' => $package->getPackageIcon() ? PathUtility::getAbsoluteWebPath($package->getPackageIcon()) : '',
            ];
        }

        return $availableExtensions;
    }

    public function isEditable(string $packageKey): bool
    {
        if ($packageKey === 'content_blocks') {
            return false;
        }
        $packages = $this->packageResolver->getAvailablePackages();
        return isset($packages[$packageKey]);
    }
}
