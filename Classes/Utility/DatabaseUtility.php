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

use Psr\Log\LoggerInterface;
use TYPO3\CMS\Core\Database\Schema\SchemaMigrator;
use TYPO3\CMS\Core\Database\Schema\SqlReader;
use TYPO3\CMS\Core\Service\OpcodeCacheService;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Install\Service\ClearCacheService;
use TYPO3\CMS\Install\Service\LateBootService;

/**
 * Utility for managing database schema changes for Content Blocks.
 *
 * Mirrors the Install Tool's MaintenanceController pattern:
 * - DI: LateBootService, ClearCacheService, SchemaMigrator
 * - SqlReader comes from a fresh container (via LateBootService)
 * - SchemaMigrator is DI-injected (boot-time instance is fine, it just
 *   compares SQL against the actual DB schema)
 *
 * @see \TYPO3\CMS\Install\Controller\MaintenanceController::databaseAnalyzerExecuteAction
 */
readonly class DatabaseUtility
{
    public function __construct(
        private LateBootService $lateBootService,
        private ClearCacheService $clearCacheService,
        private SchemaMigrator $schemaMigrator,
        private LoggerInterface $logger,
    ) {}

    /**
     * Update database schema after content block creation.
     *
     * @return array{success?: string, error?: string}
     */
    public function updateDatabaseSchema(): array
    {
        try {
            // 1) Clear all caches + opcode cache, same as Install Tool
            $this->clearCacheService->clearAll();
            GeneralUtility::makeInstance(OpcodeCacheService::class)->clearAllActive();

            // 2) Boot a fresh container so SqlReader dispatches events to
            //    SqlGenerator which discovers new content block files on disk.
            //    @see MaintenanceController::databaseAnalyzerExecuteAction
            $container = $this->lateBootService->loadExtLocalconfDatabaseAndExtTables();

            // 3) Get SqlReader from the FRESH container (not DI-injected).
            //    SchemaMigrator can stay DI-injected — it just compares SQL vs DB.
            $sqlReader = $container->get(SqlReader::class);
            $sqlStatements = $sqlReader->getCreateTableStatementArray(
                $sqlReader->getTablesDefinitionString(),
            );

            // 4) Get update suggestions and select only safe operations.
            //    @see PackageActivationService::updateDatabase
            $updateSuggestions = $this->schemaMigrator->getUpdateSuggestions($sqlStatements);
            $updateSuggestions = array_merge_recursive(...array_values($updateSuggestions));

            $selectedStatements = [];
            foreach (['add', 'change', 'create_table', 'change_table'] as $action) {
                if (empty($updateSuggestions[$action])) {
                    continue;
                }
                // Key = statement hash (SchemaMigrator::migrate() selects via
                // array_intersect_key on the keys). Use the hash as value too so
                // the payload is array<string, string> — matches the v14 type
                // hint while staying identical at runtime on v13.
                $hashes = array_keys($updateSuggestions[$action]);
                $selectedStatements = array_merge(
                    $selectedStatements,
                    array_combine($hashes, $hashes),
                );
            }

            if ($selectedStatements === []) {
                return ['success' => 'Database schema is up to date. No changes needed.'];
            }

            // 5) Execute the migration
            $this->schemaMigrator->migrate($sqlStatements, $selectedStatements);

            return [
                'success' => sprintf(
                    'Database schema updated. %d statement(s) executed.',
                    count($selectedStatements),
                ),
            ];
        } catch (\Exception $e) {
            $this->logger->error('DatabaseUtility: Schema update failed', [
                'error' => $e->getMessage(),
            ]);
            return [
                'error' => sprintf('Failed to update database schema: %s', $e->getMessage()),
            ];
        }
    }
}
