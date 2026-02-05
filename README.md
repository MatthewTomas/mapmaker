# MapMaker - City Atlas Generator

A web-based tool for creating customizable city maps with boundary outlines. Designed for creating print-ready maps for city atlases, with support for batch exports and professional cartographic elements.

![MapMaker Screenshot](screenshot.png)

## Features

### Core Functionality
- **City Search**: Live search with dropdown as you type - finds cities with polygon boundaries
- **Boundary Display**: Customizable stroke, fill, and mask styling
- **Batch Export**: Select multiple cities and export all as a ZIP file
- **High-Quality Output**: PNG/JPEG/WebP at 1x-4x resolution

### Map Styles
- OpenStreetMap (Standard & Humanitarian)
- Carto (Light, Dark, Voyager)
- Stadia Stamen (Toner, Terrain, Watercolor)
- ESRI (Imagery, Topo, Street)
- OpenTopoMap

### Print-Ready Features
- **Page Layouts**: Letter, Tabloid, A4, A3, and custom dimensions
- **DPI Settings**: 72-600 DPI for screen and print
- **Title Block**: Map title, subtitle, positioning
- **North Arrow**: 3 styles (Simple, Compass, Minimal)
- **Date & Coordinates**: Optional overlays

### Additional Boundaries
- Add parent boundaries (county, state)
- Add sub-areas (neighborhoods, districts)
- Secondary styling options

### Annotations
- Text labels
- Callouts with background
- Markers
- Drag to reposition

### Style Presets
- 8 built-in presets (Default, Minimal, Bold, Neon, Vintage, Blueprint, Satellite, Dark)
- Save/load custom presets

### Data Management
- Save/load city lists
- Collapsible panel UI
- Panel state persistence

## Usage

1. Open `index.html` in a web browser, or serve locally:
   ```bash
   python3 -m http.server 8080
   ```

2. Search for a city in the search box - results appear as you type

3. Click a city to add it to your list and see its boundary

4. Customize the appearance using the sidebar panels

5. Export single views or batch export all cities as a ZIP

## Map Data

Map data is provided by [OpenStreetMap](https://www.openstreetmap.org/) contributors and is available under the [ODbL license](https://opendatacommons.org/licenses/odbl/).

Geocoding is provided by [Nominatim](https://nominatim.org/).

## Commercial Use

The base OpenStreetMap tiles and data are free for commercial use with attribution. Some tile providers (Stadia, ESRI) may have usage limits or require API keys for heavy use.

## License

MIT License - See LICENSE file for details.

## Roadmap

- [ ] Data layers for thematic mapping
- [ ] GeoJSON import/export
- [ ] Legend generation
- [ ] Multiple map layouts per page
- [ ] PDF export

## Contributing

Contributions welcome! Please open an issue or pull request.
