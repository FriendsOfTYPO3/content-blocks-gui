<?php

$EM_CONF['content_blocks_gui'] = [
    'title' => 'TYPO3 Content Blocks GUI',
    'description' => 'The Content Blocks GUI provides a visual backend module for creating and editing Content Blocks.',
    'category' => 'module',
    'state' => 'beta',
    'author' => 'TYPO3 Content Types Team',
    'author_email' => '',
    'author_company' => '',
    'version' => '1.0.0',
    'constraints' => [
        'depends' => [
            'typo3' => '13.4.19-13.99.99',
            'content_blocks' => '1.4.6-1.99.99',
        ],
        'conflicts' => [],
        'suggests' => [],
    ],
];
