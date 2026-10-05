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

use TYPO3\CMS\Core\Http\JsonResponse;

abstract class AbstractAnswer
{
    protected $success = false;

    protected $message = '';
    protected $body = [];

    public function addToBody(string $index, mixed $data): void
    {
        $this->body[$index] = $data;
    }

    public function getResponse(): JsonResponse
    {
        return new JsonResponse([
            'body' => $this->body,
            'success' => $this->success,
            'message' => $this->message,
        ]);
    }

    public function isSuccess(): bool
    {
        return $this->success;
    }

    public function getMessage(): string
    {
        return (string) $this->message;
    }
}
