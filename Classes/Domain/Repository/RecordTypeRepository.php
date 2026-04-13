<?php

declare(strict_types=1);

namespace FriendsOfTYPO3\ContentBlocksGui\Domain\Repository;

use Doctrine\DBAL\Exception\TableNotFoundException;
use TYPO3\CMS\ContentBlocks\Definition\ContentType\ContentType;
use TYPO3\CMS\Core\Database\Query\Restriction\HiddenRestriction;

class RecordTypeRepository extends AbstractRepository
{
    /**
     * RecordTypes may use a custom table without a type field,
     * so we conditionally add the WHERE clause.
     */
    public function countUsages(string|int $name, ContentType $contentType, string $tableName): int
    {
        try {
            $this->queryBuilder = $this->connectionPool->getQueryBuilderForTable($tableName);
            $this->queryBuilder->getRestrictions()->removeByType(HiddenRestriction::class);
            $this->queryBuilder
                ->count('uid')
                ->from($tableName);

            $typeField = $contentType->getTypeField();
            if ($typeField !== null && $typeField !== '') {
                $this->queryBuilder->where(
                    $this->queryBuilder->expr()->eq($typeField, $this->queryBuilder->createNamedParameter($name)),
                );
            }

            return $this->queryBuilder
                ->executeQuery()
                ->fetchOne();
        } catch (TableNotFoundException) {
            // Table may not exist yet (e.g. newly created Record Type
            // before database schema update has run).
            return 0;
        }
    }
}
