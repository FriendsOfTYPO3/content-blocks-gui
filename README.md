[![TYPO3 compatibility](https://img.shields.io/badge/TYPO3-13.4-ff8700?maxAge=3600&logo=typo3)](https://get.typo3.org/)

# TYPO3 Content Blocks GUI

> **Alpha state**: This extension may contain bugs and can potentially break
> your TYPO3 installation. **Do not install on production systems.** Use only
> in development environments.

The Content Blocks GUI provides a visual backend module for creating and editing
[Content Blocks](https://github.com/friendsoftypo3/content-blocks) definitions.
It serves as a kickstarter and YAML editor for the Content Blocks extension,
allowing integrators to build Content Elements, Page Types, Record Types, and
Basics through a drag-and-drop interface instead of writing YAML by hand.

|                              | URL                                                                                                          |
|------------------------------|--------------------------------------------------------------------------------------------------------------|
| **Repository:**              | https://github.com/FriendsOfTYPO3/content-blocks-gui                                                        |
| **Development:**             | https://github.com/krausandre/typo3-content-blocks/tree/feature/friendsoftypo3-content-blocks-gui            |
| **TER:**                     | https://extensions.typo3.org/extension/content_blocks_gui                                                    |
| **Content Blocks:**          | https://github.com/friendsoftypo3/content-blocks                                                             |
| **Content Blocks Docs:**     | https://docs.typo3.org/p/friendsoftypo3/content-blocks/main/en-us/                                          |

## Features

**Visual Editor**

- Three-pane drag-and-drop editor for composing Content Block field definitions
- Left pane with settings, field component library, and Basics management
- Middle pane for visual field arrangement with nested field support (Collections)
- Right pane with field-specific property configuration (value pickers, ranges, sliders, items, allowed types)
- Base field auto-detection for `tt_content` and `pages` columns
- Field validation and system reserved field detection

**Content Type Support**

- Content Elements (custom CType, grouping, icons, field prefixing)
- Page Types (custom doktype values)
- Record Types (custom tables and type fields)
- Basics / Field Mixins (reusable field collections with circular dependency detection)

**List View**

- Tabbed overview with counters for each content type
- Search, multi-column sorting, and usage reference counts
- Create, edit, duplicate, and delete Content Blocks
- Multi-select mode for batch operations

**Import and Export**

- Download individual or multiple Content Blocks as ZIP archives
- Multi-step upload wizard with conflict detection and resolution
- Preserves directory structure and language files

**Administration**

- Automatic cache clearing after save and import operations
- Extension-aware storage (choose target extension for new blocks)

## Compatibility

| Extension version | TYPO3 version | PHP version |
|-------------------|---------------|-------------|
| 0.1.x (alpha)     | 13.4          | 8.2+        |

## Requirements

This extension requires the Content Blocks extension:

- [friendsoftypo3/content-blocks](https://packagist.org/packages/friendsoftypo3/content-blocks) (^1.3)

## Installation

Require this package via Composer:

```
composer require --dev friendsoftypo3/content-blocks-gui
```

Or install it via the Extension Manager in the TYPO3 backend. The extension key
is `content_blocks_gui`.

**Important:** The GUI looks for extensions that require `friendsoftypo3/content-blocks`
in their `composer.json` to use as storage destination for new Content Blocks. Make sure
your sitepackage or target extension has this dependency, then run `composer update` to
refresh the package metadata. Otherwise the extension dropdown in the editor will be empty.

After installation, the module is available in the TYPO3 backend under
**Admin Tools > Content Blocks**.

## Feedback and Support

You can reach us on the [TYPO3 Slack](https://typo3.org/community/meet/chat-slack)
channel `#cig-structuredcontent`. We appreciate any constructive feedback and
will help you, if you have any problems.

## License

This project is licensed under GPL-2.0-or-later.
