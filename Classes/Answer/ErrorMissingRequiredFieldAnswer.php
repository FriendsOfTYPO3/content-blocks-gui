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

namespace FriendsOfTYPO3\ContentBlocksGui\Answer;

/**
 * Returned when a Content Type is saved without its mandatory settings
 * (vendor, name, host extension). See issue #20.
 */
class ErrorMissingRequiredFieldAnswer extends AbstractAnswer implements AnswerInterface
{
    /**
     * @param string[] $missingFields
     */
    public function __construct(array $missingFields)
    {
        $this->message = 'The following required fields are missing: ' . implode(', ', $missingFields) . '.';
        $this->addToBody('missingFields', array_values($missingFields));
    }
}
