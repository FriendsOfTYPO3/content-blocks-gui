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

/**
 * Detects YAML tags such as "!php/const" in a config.yaml. Symfony's parser
 * silently resolves unknown tags to null, so a block using them would lose
 * its references on the next save through the GUI (issue #22).
 */
final class YamlTagUtility
{
    /**
     * A tag at a value position: after "key: " or at the start of a list item.
     * A "!" inside text ("label: 'Hello!'", "displayCond: 'FIELD:x:!=:1'") does
     * not match because it is not preceded by ": " or "- ".
     */
    private const TAG_PATTERN = '/(?:^\s*-\s+|:\s+)!!?[A-Za-z0-9_\/.:-]+(?=\s|$)/m';

    public static function containsTags(string $yaml): bool
    {
        return preg_match(self::TAG_PATTERN, $yaml) === 1;
    }

    public static function fileContainsTags(string $path): bool
    {
        if (!is_file($path)) {
            return false;
        }
        return self::containsTags((string) file_get_contents($path));
    }
}
