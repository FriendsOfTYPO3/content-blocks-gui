<?php

$finder = (new PhpCsFixer\Finder())
    ->in(__DIR__ . '/../../Classes')
    ->in(__DIR__ . '/../../Tests');

return (new PhpCsFixer\Config())
    ->setRiskyAllowed(true)
    ->setRules([
        '@PER-CS2.0' => true,
        'no_unused_imports' => true,
        'ordered_imports' => ['sort_algorithm' => 'alpha'],
        'single_line_empty_body' => true,
        'no_extra_blank_lines' => true,
        'no_trailing_whitespace' => true,
        'no_whitespace_in_blank_line' => true,
        'declare_strict_types' => true,
    ])
    ->setFinder($finder);
