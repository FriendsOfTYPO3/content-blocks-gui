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

/**
 * Field identifiers end up as database column names, so besides trimming and
 * lower-casing, whitespace, hyphens and slashes are folded to underscores
 * (runs collapse to a single one). Other characters are left as typed so the
 * validation badge can report them instead of silently dropping input.
 */
export function normalizeFieldIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase().replace(/[\s/-]+/g, '_');
}
