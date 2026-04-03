<?php

$EM_CONF['content_blocks_gui'] = [
    'title' => 'TYPO3 Content Blocks GUI',
    'description' => 'The Content Blocks GUI provides a visual backend module for creating and editing Content Blocks.',
    'category' => 'module',
    'state' => 'alpha',
    'author' => 'TYPO3 Content Types Team',
    'author_email' => '',
    'author_company' => '',
    'version' => '0.1.2',
    'constraints' => [
        'depends' => [
            'typo3' => '13.4.19-13.99.99',
            'content_blocks' => '1.3.17-1.99.99',
        ],
        'conflicts' => [],
        'suggests' => [],
    ],
];
