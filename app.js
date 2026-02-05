/**
 * MapMaker - City Atlas Generator
 * Application JavaScript
 */

// ============================================
// State Management
// ============================================

const state = {
    cities: [],
    activeCityId: null,
    map: null,
    tileLayer: null,
    scaleControl: null,
    layers: {
        mask: null,
        boundaries: L.layerGroup(),
        markers: L.layerGroup(),
        labels: L.layerGroup(),
        additionalBoundaries: L.layerGroup(),
        annotations: L.layerGroup(),
        dataLayers: {}  // Will hold layer groups by layer type
    },
    currentBoundaryLayer: null,
    isExporting: false,
    cancelExport: false,
    additionalBoundaries: [],
    annotations: [],
    activeAnnotationTool: null,
    editingAnnotationId: null,
    pageSize: 'auto',
    fixedDimensions: null,
    activeLayers: new Set(),  // Track which data layers are enabled
    layerData: {}  // Cache for fetched layer data
};

// ============================================
// Tile Providers
// ============================================

const tileProviders = {
    osm: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    osmHot: {
        url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles: <a href="https://www.hotosm.org/">HOT</a>'
    },
    cartoLight: {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions">CARTO</a>'
    },
    cartoDark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions">CARTO</a>'
    },
    cartoVoyager: {
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions">CARTO</a>'
    },
    stamenToner: {
        url: 'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png',
        attribution: '© <a href="https://stadiamaps.com/">Stadia Maps</a>, © <a href="https://stamen.com/">Stamen Design</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    },
    stamenTerrain: {
        url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png',
        attribution: '© <a href="https://stadiamaps.com/">Stadia Maps</a>, © <a href="https://stamen.com/">Stamen Design</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    },
    stamenWatercolor: {
        url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg',
        attribution: '© <a href="https://stadiamaps.com/">Stadia Maps</a>, © <a href="https://stamen.com/">Stamen Design</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    },
    esriWorldImagery: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '© <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics'
    },
    esriWorldTopo: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        attribution: '© <a href="https://www.esri.com/">Esri</a>'
    },
    esriWorldStreet: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        attribution: '© <a href="https://www.esri.com/">Esri</a>'
    },
    openTopo: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a>, © <a href="https://opentopomap.org">OpenTopoMap</a>'
    }
};

// ============================================
// Page Size Configurations
// ============================================

const pageSizes = {
    'auto': null,
    'letter': { width: 2550, height: 3300, label: '8.5" × 11" @ 300dpi' },
    'letter-landscape': { width: 3300, height: 2550, label: '11" × 8.5" @ 300dpi' },
    'tabloid': { width: 3300, height: 5100, label: '11" × 17" @ 300dpi' },
    'tabloid-landscape': { width: 5100, height: 3300, label: '17" × 11" @ 300dpi' },
    'a4': { width: 2480, height: 3508, label: '210 × 297mm @ 300dpi' },
    'a4-landscape': { width: 3508, height: 2480, label: '297 × 210mm @ 300dpi' },
    'a3': { width: 3508, height: 4961, label: '297 × 420mm @ 300dpi' },
    'a3-landscape': { width: 4961, height: 3508, label: '420 × 297mm @ 300dpi' },
    'square-sm': { width: 1000, height: 1000, label: '1000 × 1000px' },
    'square-md': { width: 2000, height: 2000, label: '2000 × 2000px' },
    'square-lg': { width: 4000, height: 4000, label: '4000 × 4000px' },
    'custom': null
};

// ============================================
// Data Layer Definitions (Overpass API queries)
// ============================================

const dataLayerDefs = {
    // Civic & Government
    schools: {
        icon: '🏫',
        query: 'node["amenity"="school"];way["amenity"="school"];node["amenity"="kindergarten"];way["amenity"="kindergarten"];node["amenity"="college"];way["amenity"="college"];node["amenity"="university"];way["amenity"="university"];',
        color: '#3b82f6'
    },
    hospitals: {
        icon: '🏥',
        query: 'node["amenity"="hospital"];way["amenity"="hospital"];node["amenity"="clinic"];way["amenity"="clinic"];',
        color: '#ef4444'
    },
    police: {
        icon: '🚔',
        query: 'node["amenity"="police"];way["amenity"="police"];',
        color: '#1e3a8a'
    },
    fire_stations: {
        icon: '🚒',
        query: 'node["amenity"="fire_station"];way["amenity"="fire_station"];',
        color: '#dc2626'
    },
    libraries: {
        icon: '📚',
        query: 'node["amenity"="library"];way["amenity"="library"];',
        color: '#8b5cf6'
    },
    post_offices: {
        icon: '📮',
        query: 'node["amenity"="post_office"];way["amenity"="post_office"];',
        color: '#0ea5e9'
    },
    government: {
        icon: '🏛️',
        query: 'node["amenity"="townhall"];way["amenity"="townhall"];node["office"="government"];way["office"="government"];node["amenity"="courthouse"];way["amenity"="courthouse"];',
        color: '#64748b'
    },
    places_of_worship: {
        icon: '⛪',
        query: 'node["amenity"="place_of_worship"];way["amenity"="place_of_worship"];',
        color: '#a855f7'
    },
    
    // Transportation
    bus_stops: {
        icon: '🚏',
        query: 'node["highway"="bus_stop"];node["public_transport"="stop_position"]["bus"="yes"];',
        color: '#22c55e'
    },
    train_stations: {
        icon: '🚉',
        query: 'node["railway"="station"];node["railway"="halt"];way["railway"="station"];',
        color: '#f59e0b'
    },
    subway: {
        icon: '🚇',
        query: 'node["railway"="subway_entrance"];node["station"="subway"];',
        color: '#6366f1'
    },
    parking: {
        icon: '🅿️',
        query: 'node["amenity"="parking"];way["amenity"="parking"];',
        color: '#0284c7'
    },
    bike_parking: {
        icon: '🚲',
        query: 'node["amenity"="bicycle_parking"];',
        color: '#84cc16'
    },
    ev_charging: {
        icon: '⚡',
        query: 'node["amenity"="charging_station"];',
        color: '#eab308'
    },
    
    // Parks & Recreation
    parks: {
        icon: '🌳',
        query: 'way["leisure"="park"];relation["leisure"="park"];node["leisure"="park"];',
        color: '#22c55e'
    },
    playgrounds: {
        icon: '🛝',
        query: 'node["leisure"="playground"];way["leisure"="playground"];',
        color: '#f97316'
    },
    sports: {
        icon: '⚽',
        query: 'node["leisure"="pitch"];way["leisure"="pitch"];node["leisure"="sports_centre"];way["leisure"="sports_centre"];',
        color: '#10b981'
    },
    swimming: {
        icon: '🏊',
        query: 'node["leisure"="swimming_pool"];way["leisure"="swimming_pool"];node["sport"="swimming"];',
        color: '#06b6d4'
    },
    nature: {
        icon: '🏞️',
        query: 'way["leisure"="nature_reserve"];relation["leisure"="nature_reserve"];way["landuse"="forest"];',
        color: '#15803d'
    },
    beaches: {
        icon: '🏖️',
        query: 'node["natural"="beach"];way["natural"="beach"];',
        color: '#fbbf24'
    },
    
    // Commerce & Services
    supermarkets: {
        icon: '🛒',
        query: 'node["shop"="supermarket"];way["shop"="supermarket"];',
        color: '#f97316'
    },
    pharmacies: {
        icon: '💊',
        query: 'node["amenity"="pharmacy"];way["amenity"="pharmacy"];',
        color: '#22c55e'
    },
    banks: {
        icon: '🏦',
        query: 'node["amenity"="bank"];way["amenity"="bank"];',
        color: '#0f766e'
    },
    atms: {
        icon: '💳',
        query: 'node["amenity"="atm"];',
        color: '#059669'
    },
    gas_stations: {
        icon: '⛽',
        query: 'node["amenity"="fuel"];way["amenity"="fuel"];',
        color: '#dc2626'
    },
    restaurants: {
        icon: '🍽️',
        query: 'node["amenity"="restaurant"];way["amenity"="restaurant"];',
        color: '#ea580c'
    },
    cafes: {
        icon: '☕',
        query: 'node["amenity"="cafe"];',
        color: '#92400e'
    },
    hotels: {
        icon: '🏨',
        query: 'node["tourism"="hotel"];way["tourism"="hotel"];node["tourism"="motel"];',
        color: '#7c3aed'
    },
    
    // Culture & Tourism
    museums: {
        icon: '🏛️',
        query: 'node["tourism"="museum"];way["tourism"="museum"];',
        color: '#be185d'
    },
    theaters: {
        icon: '🎭',
        query: 'node["amenity"="theatre"];way["amenity"="theatre"];',
        color: '#9333ea'
    },
    cinemas: {
        icon: '🎬',
        query: 'node["amenity"="cinema"];way["amenity"="cinema"];',
        color: '#4f46e5'
    },
    monuments: {
        icon: '🗽',
        query: 'node["historic"="monument"];node["historic"="memorial"];way["historic"="monument"];',
        color: '#78716c'
    },
    viewpoints: {
        icon: '👀',
        query: 'node["tourism"="viewpoint"];',
        color: '#0891b2'
    },
    tourist_info: {
        icon: 'ℹ️',
        query: 'node["tourism"="information"];',
        color: '#2563eb'
    }
};

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    setupEventListeners();
    setupCollapsiblePanels();
    setupColorInputSync();
    setupSliderDisplays();
    updateDimensionPreview();
    setupDataLayerListeners();
});

function initializeMap() {
    state.map = L.map('map', {
        center: [39.8283, -98.5795], // Center of US
        zoom: 4,
        zoomControl: true
    });

    // Add default tile layer
    setTileLayer('osm');
    
    // Add scale control
    state.scaleControl = L.control.scale({
        position: 'bottomright',
        imperial: true,
        metric: true
    }).addTo(state.map);
    
    // Add layer groups to map
    state.layers.additionalBoundaries.addTo(state.map);
    state.layers.boundaries.addTo(state.map);
    state.layers.markers.addTo(state.map);
    state.layers.labels.addTo(state.map);
    state.layers.annotations.addTo(state.map);
    
    // Map click handler for annotations
    state.map.on('click', handleMapClick);
}

function setTileLayer(style) {
    const provider = tileProviders[style];
    if (!provider) return;
    
    if (state.tileLayer) {
        state.map.removeLayer(state.tileLayer);
    }
    
    state.tileLayer = L.tileLayer(provider.url, {
        attribution: provider.attribution,
        maxZoom: 19
    }).addTo(state.map);
}

// ============================================
// Event Listeners Setup
// ============================================

// Debounce helper
let searchTimeout = null;
let boundarySearchTimeout = null;

function setupEventListeners() {
    // City Search - live as you type with debounce
    const citySearchInput = document.getElementById('citySearch');
    
    citySearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(searchTimeout);
        
        if (query.length < 2) {
            document.getElementById('searchResults').innerHTML = '';
            return;
        }
        
        // Debounce - wait 300ms after typing stops
        searchTimeout = setTimeout(() => {
            searchCities(query);
        }, 300);
    });
    
    document.getElementById('searchBtn').addEventListener('click', () => {
        const query = citySearchInput.value.trim();
        if (query) searchCities(query);
    });
    
    citySearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            if (query) searchCities(query);
        }
    });
    
    // Boundary search - live as you type with debounce
    const boundarySearchInput = document.getElementById('boundarySearch');
    
    boundarySearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(boundarySearchTimeout);
        
        if (query.length < 2) {
            document.getElementById('boundarySearchResults').innerHTML = '';
            return;
        }
        
        boundarySearchTimeout = setTimeout(() => {
            searchBoundaries(query);
        }, 300);
    });
    
    document.getElementById('boundarySearchBtn').addEventListener('click', () => {
        const query = boundarySearchInput.value.trim();
        if (query) searchBoundaries(query);
    });
    
    boundarySearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(boundarySearchTimeout);
            const query = e.target.value.trim();
            if (query) searchBoundaries(query);
        }
    });
    
    // City list management
    document.getElementById('clearAllBtn').addEventListener('click', clearAllCities);
    document.getElementById('saveCityListBtn').addEventListener('click', saveCityList);
    document.getElementById('loadCityListBtn').addEventListener('click', () => {
        document.getElementById('cityListFileInput').click();
    });
    document.getElementById('cityListFileInput').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            loadCityListFromFile(e.target.files[0]);
        }
    });
    
    // Expand/Collapse all
    document.getElementById('expandAllBtn').addEventListener('click', expandAllPanels);
    document.getElementById('collapseAllBtn').addEventListener('click', collapseAllPanels);
    
    // Map style
    document.getElementById('mapStyle').addEventListener('change', (e) => {
        setTileLayer(e.target.value);
    });
    
    // Map controls visibility
    document.getElementById('showAttribution').addEventListener('change', (e) => {
        const attribution = document.querySelector('.leaflet-control-attribution');
        if (attribution) {
            attribution.style.display = e.target.checked ? 'block' : 'none';
        }
    });
    
    document.getElementById('showZoomControl').addEventListener('change', (e) => {
        const zoomControl = document.querySelector('.leaflet-control-zoom');
        if (zoomControl) {
            zoomControl.style.display = e.target.checked ? 'flex' : 'none';
        }
    });
    
    document.getElementById('showScale').addEventListener('change', (e) => {
        const scaleControl = document.querySelector('.leaflet-control-scale');
        if (scaleControl) {
            scaleControl.style.display = e.target.checked ? 'block' : 'none';
        }
    });
    
    // Page layout
    document.getElementById('pageSize').addEventListener('change', handlePageSizeChange);
    document.getElementById('customWidth').addEventListener('input', updateDimensionPreview);
    document.getElementById('customHeight').addEventListener('input', updateDimensionPreview);
    document.getElementById('exportDPI').addEventListener('change', updateDimensionPreview);
    document.getElementById('applyPageSizeBtn').addEventListener('click', applyPageSize);
    document.getElementById('useFixedDimensions').addEventListener('change', (e) => {
        if (!e.target.checked) {
            resetMapDimensions();
        }
    });
    
    // Boundary style changes
    const boundaryInputs = [
        'strokeColor', 'strokeWeight', 'strokeOpacity', 'strokeStyle',
        'showFill', 'fillColor', 'fillOpacity',
        'showMask', 'maskColor', 'maskOpacity',
        'showCenterMarker', 'markerStyle', 'markerSize', 'markerColor'
    ];
    boundaryInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => refreshCurrentCity());
            el.addEventListener('input', () => refreshCurrentCity());
        }
    });
    
    // Secondary boundary style
    const secondaryInputs = [
        'secondaryStrokeColor', 'secondaryStrokeWeight', 'secondaryStrokeStyle', 'secondaryShowFill'
    ];
    secondaryInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => refreshAdditionalBoundaries());
            el.addEventListener('input', () => refreshAdditionalBoundaries());
        }
    });
    
    // Label settings
    const labelInputs = [
        'showCityLabel', 'labelPosition', 'labelFontSize', 'labelFontWeight',
        'labelColor', 'labelShadow', 'labelBackground', 'labelBgColor', 'labelBgOpacity'
    ];
    labelInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => refreshCurrentCity());
            el.addEventListener('input', () => refreshCurrentCity());
        }
    });
    
    // Title block settings
    const titleInputs = [
        'showMapTitle', 'mapTitle', 'mapSubtitle', 'titlePosition',
        'titleFontSize', 'titleColor', 'showNorthArrow', 'northArrowStyle',
        'northArrowPosition', 'northArrowSize', 'showDateStamp', 'showCoordinates'
    ];
    titleInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', updateTitleBlock);
            el.addEventListener('input', updateTitleBlock);
        }
    });
    
    // Annotation tools
    document.getElementById('addTextBtn').addEventListener('click', () => setAnnotationTool('text'));
    document.getElementById('addCalloutBtn').addEventListener('click', () => setAnnotationTool('callout'));
    document.getElementById('addMarkerBtn').addEventListener('click', () => setAnnotationTool('marker'));
    document.getElementById('clearAnnotationsBtn').addEventListener('click', clearAllAnnotations);
    
    // Annotation style
    const annotationInputs = ['annotationFontSize', 'annotationColor', 'annotationShadow', 'annotationBg'];
    annotationInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', refreshAnnotations);
            el.addEventListener('input', refreshAnnotations);
        }
    });
    
    // Annotation modal
    document.getElementById('saveAnnotationBtn').addEventListener('click', saveAnnotation);
    document.getElementById('cancelAnnotationBtn').addEventListener('click', closeAnnotationModal);
    
    // View controls
    document.getElementById('zoomToFitBtn').addEventListener('click', zoomToFit);
    document.getElementById('resetViewBtn').addEventListener('click', resetView);
    
    // Export
    document.getElementById('exportCurrentBtn').addEventListener('click', exportCurrentView);
    document.getElementById('exportAllBtn').addEventListener('click', exportAllCities);
    document.getElementById('cancelExportBtn').addEventListener('click', () => {
        state.cancelExport = true;
    });
    
    document.getElementById('imageFormat').addEventListener('change', (e) => {
        const qualityLabel = document.getElementById('qualityLabel');
        qualityLabel.style.display = e.target.value === 'png' ? 'none' : 'block';
    });
    
    // Presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            applyPreset(btn.dataset.preset);
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    document.getElementById('savePresetBtn').addEventListener('click', saveCurrentPreset);
    document.getElementById('loadPresetBtn').addEventListener('click', () => {
        document.getElementById('presetFileInput').click();
    });
    document.getElementById('presetFileInput').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            loadPresetFromFile(e.target.files[0]);
        }
    });
}

// ============================================
// Collapsible Panels
// ============================================

function setupCollapsiblePanels() {
    const panels = document.querySelectorAll('.panel.collapsible');
    
    panels.forEach(panel => {
        const header = panel.querySelector('.panel-header');
        const panelId = panel.dataset.panel;
        
        // Load saved state
        const savedState = localStorage.getItem(`panel_${panelId}`);
        if (savedState === 'collapsed') {
            panel.classList.add('collapsed');
        } else if (savedState === 'expanded') {
            panel.classList.remove('collapsed');
        }
        
        header.addEventListener('click', () => {
            panel.classList.toggle('collapsed');
            
            // Save state
            const isCollapsed = panel.classList.contains('collapsed');
            localStorage.setItem(`panel_${panelId}`, isCollapsed ? 'collapsed' : 'expanded');
        });
    });
}

function expandAllPanels() {
    const panels = document.querySelectorAll('.panel.collapsible');
    panels.forEach(panel => {
        panel.classList.remove('collapsed');
        const panelId = panel.dataset.panel;
        localStorage.setItem(`panel_${panelId}`, 'expanded');
    });
}

function collapseAllPanels() {
    const panels = document.querySelectorAll('.panel.collapsible');
    panels.forEach(panel => {
        panel.classList.add('collapsed');
        const panelId = panel.dataset.panel;
        localStorage.setItem(`panel_${panelId}`, 'collapsed');
    });
}

// ============================================
// Color Input Sync
// ============================================

function setupColorInputSync() {
    const colorPairs = [
        ['strokeColor', 'strokeColorText'],
        ['fillColor', 'fillColorText'],
        ['maskColor', 'maskColorText'],
        ['markerColor', 'markerColorText'],
        ['labelColor', 'labelColorText'],
        ['labelBgColor', 'labelBgColorText'],
        ['exportBgColor', 'exportBgColorText'],
        ['secondaryStrokeColor', 'secondaryStrokeColorText'],
        ['titleColor', 'titleColorText'],
        ['annotationColor', 'annotationColorText']
    ];
    
    colorPairs.forEach(([colorId, textId]) => {
        const colorInput = document.getElementById(colorId);
        const textInput = document.getElementById(textId);
        
        if (colorInput && textInput) {
            colorInput.addEventListener('input', () => {
                textInput.value = colorInput.value;
            });
            
            textInput.addEventListener('input', () => {
                if (/^#[0-9A-Fa-f]{6}$/.test(textInput.value)) {
                    colorInput.value = textInput.value;
                }
            });
            
            textInput.addEventListener('blur', () => {
                textInput.value = colorInput.value;
            });
        }
    });
}

// ============================================
// Slider Displays
// ============================================

function setupSliderDisplays() {
    const sliders = [
        { id: 'strokeWeight', suffix: 'px' },
        { id: 'strokeOpacity', suffix: '%' },
        { id: 'fillOpacity', suffix: '%' },
        { id: 'maskOpacity', suffix: '%' },
        { id: 'markerSize', suffix: 'px' },
        { id: 'labelFontSize', suffix: 'px' },
        { id: 'labelBgOpacity', suffix: '%' },
        { id: 'fitPadding', suffix: 'px' },
        { id: 'imageQuality', suffix: '%' },
        { id: 'batchDelay', suffix: 'ms' },
        { id: 'tileLoadWait', suffix: 'ms' },
        { id: 'secondaryStrokeWeight', suffix: 'px' },
        { id: 'titleFontSize', suffix: 'px' },
        { id: 'northArrowSize', suffix: 'px' },
        { id: 'annotationFontSize', suffix: 'px' }
    ];
    
    sliders.forEach(({ id, suffix }) => {
        const slider = document.getElementById(id);
        const display = document.getElementById(`${id}Value`);
        
        if (slider && display) {
            slider.addEventListener('input', () => {
                display.textContent = `${slider.value}${suffix}`;
            });
        }
    });
}

// ============================================
// Page Layout
// ============================================

function handlePageSizeChange() {
    const pageSize = document.getElementById('pageSize').value;
    const customDimensions = document.getElementById('customDimensions');
    
    if (pageSize === 'custom') {
        customDimensions.style.display = 'flex';
    } else {
        customDimensions.style.display = 'none';
    }
    
    updateDimensionPreview();
}

function updateDimensionPreview() {
    const pageSize = document.getElementById('pageSize').value;
    const dpi = parseInt(document.getElementById('exportDPI').value);
    const previewEl = document.getElementById('dimensionPreview');
    
    if (pageSize === 'auto') {
        previewEl.textContent = 'Auto';
        return;
    }
    
    let width, height;
    
    if (pageSize === 'custom') {
        width = parseInt(document.getElementById('customWidth').value) || 1920;
        height = parseInt(document.getElementById('customHeight').value) || 1080;
    } else {
        const size = pageSizes[pageSize];
        if (size) {
            // Scale dimensions based on DPI (base is 300)
            const scale = dpi / 300;
            width = Math.round(size.width * scale);
            height = Math.round(size.height * scale);
        } else {
            previewEl.textContent = 'Unknown';
            return;
        }
    }
    
    previewEl.textContent = `${width} × ${height}px`;
    state.fixedDimensions = { width, height };
}

function applyPageSize() {
    const pageSize = document.getElementById('pageSize').value;
    const useFixed = document.getElementById('useFixedDimensions').checked;
    
    if (pageSize === 'auto' || !useFixed) {
        resetMapDimensions();
        showToast('Map dimensions reset to auto', 'success');
        return;
    }
    
    updateDimensionPreview();
    
    if (state.fixedDimensions) {
        const mapWrapper = document.getElementById('mapWrapper');
        const mapContainer = document.querySelector('.map-container');
        
        // Calculate display size (max 90% of container)
        const containerRect = mapContainer.getBoundingClientRect();
        const maxWidth = containerRect.width * 0.9;
        const maxHeight = containerRect.height * 0.9;
        
        const aspectRatio = state.fixedDimensions.width / state.fixedDimensions.height;
        
        let displayWidth, displayHeight;
        
        if (maxWidth / aspectRatio <= maxHeight) {
            displayWidth = maxWidth;
            displayHeight = maxWidth / aspectRatio;
        } else {
            displayHeight = maxHeight;
            displayWidth = maxHeight * aspectRatio;
        }
        
        mapWrapper.classList.add('fixed-size');
        mapWrapper.style.width = `${displayWidth}px`;
        mapWrapper.style.height = `${displayHeight}px`;
        
        // Invalidate map size
        setTimeout(() => {
            state.map.invalidateSize();
            if (state.activeCityId) {
                zoomToFit();
            }
        }, 100);
        
        showToast(`Applied ${state.fixedDimensions.width}×${state.fixedDimensions.height}px layout`, 'success');
    }
}

function resetMapDimensions() {
    const mapWrapper = document.getElementById('mapWrapper');
    mapWrapper.classList.remove('fixed-size');
    mapWrapper.style.width = '';
    mapWrapper.style.height = '';
    
    setTimeout(() => {
        state.map.invalidateSize();
    }, 100);
}

// ============================================
// City Search
// ============================================

async function searchCities(query) {
    const resultsEl = document.getElementById('searchResults');
    resultsEl.innerHTML = '<li class="muted">Searching...</li>';
    
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&limit=15&addressdetails=1`,
            {
                headers: {
                    'Accept': 'application/json'
                }
            }
        );
        
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        
        // Filter to only include results with polygon/multipolygon geometries
        const polygonResults = data.filter(result => {
            if (!result.geojson) return false;
            const geoType = result.geojson.type;
            return geoType === 'Polygon' || geoType === 'MultiPolygon';
        });
        
        if (polygonResults.length === 0) {
            resultsEl.innerHTML = '<li class="muted">No results with boundaries found</li>';
            return;
        }
        
        resultsEl.innerHTML = '';
        
        polygonResults.forEach(result => {
            const li = document.createElement('li');
            const displayName = result.display_name.split(',').slice(0, 3).join(', ');
            
            // Extract location suffix
            const locationSuffix = extractLocationSuffix(result);
            
            li.innerHTML = `
                <span>${displayName}</span>
                <span class="type-badge">${result.type}</span>
            `;
            
            li.addEventListener('click', () => {
                addCity({
                    id: result.place_id,
                    name: result.name || displayName.split(',')[0],
                    displayName: result.display_name,
                    lat: parseFloat(result.lat),
                    lon: parseFloat(result.lon),
                    geojson: result.geojson,
                    boundingbox: result.boundingbox,
                    type: result.type,
                    locationSuffix: locationSuffix
                });
                resultsEl.innerHTML = '';
                document.getElementById('citySearch').value = '';
            });
            
            resultsEl.appendChild(li);
        });
    } catch (error) {
        console.error('Search error:', error);
        resultsEl.innerHTML = '<li class="muted">Search failed. Try again.</li>';
    }
}

function extractLocationSuffix(result) {
    const address = result.address || {};
    
    // Try to get meaningful location identifiers
    const state = address.state || address.province || address.region || '';
    const country = address.country || '';
    const countryCode = address.country_code ? address.country_code.toUpperCase() : '';
    
    // Build suffix
    let suffix = '';
    
    if (state) {
        // For US states, try to get abbreviation
        const stateAbbr = getStateAbbreviation(state);
        suffix = stateAbbr || state;
    }
    
    if (countryCode && countryCode !== 'US') {
        suffix = suffix ? `${suffix}, ${countryCode}` : countryCode;
    } else if (!suffix && country) {
        suffix = country;
    }
    
    return suffix;
}

function getStateAbbreviation(stateName) {
    const states = {
        'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
        'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
        'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
        'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
        'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
        'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
        'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
        'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
        'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
        'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
        'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
        'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
        'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC'
    };
    return states[stateName] || null;
}

// ============================================
// Boundary Search (Additional Boundaries)
// ============================================

async function searchBoundaries(query) {
    const resultsEl = document.getElementById('boundarySearchResults');
    resultsEl.innerHTML = '<li class="muted">Searching...</li>';
    
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&limit=15`,
            {
                headers: {
                    'Accept': 'application/json'
                }
            }
        );
        
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        
        // Filter to only include results with polygon/multipolygon geometries
        const polygonResults = data.filter(result => {
            if (!result.geojson) return false;
            const geoType = result.geojson.type;
            return geoType === 'Polygon' || geoType === 'MultiPolygon';
        });
        
        if (polygonResults.length === 0) {
            resultsEl.innerHTML = '<li class="muted">No boundary polygons found. Try a different search (e.g., add "county" or "district").</li>';
            return;
        }
        
        resultsEl.innerHTML = '';
        
        polygonResults.forEach(result => {
            const li = document.createElement('li');
            const displayName = result.display_name.split(',').slice(0, 2).join(', ');
            
            li.innerHTML = `
                <span>${displayName}</span>
                <span class="type-badge">${result.type}</span>
            `;
            
            li.addEventListener('click', () => {
                addAdditionalBoundary({
                    id: result.place_id,
                    name: result.name || displayName.split(',')[0],
                    displayName: result.display_name,
                    type: result.type,
                    geojson: result.geojson
                });
                resultsEl.innerHTML = '';
                document.getElementById('boundarySearch').value = '';
            });
            
            resultsEl.appendChild(li);
        });
    } catch (error) {
        console.error('Boundary search error:', error);
        resultsEl.innerHTML = '<li class="muted">Search failed. Try again.</li>';
    }
}

function addAdditionalBoundary(boundary) {
    // Check if already exists
    if (state.additionalBoundaries.find(b => b.id === boundary.id)) {
        showToast('Boundary already added', 'warning');
        return;
    }
    
    state.additionalBoundaries.push(boundary);
    renderAdditionalBoundariesList();
    refreshAdditionalBoundaries();
    
    document.getElementById('boundaryCount').textContent = state.additionalBoundaries.length;
    showToast(`Added: ${boundary.name}`, 'success');
}

function removeAdditionalBoundary(boundaryId) {
    state.additionalBoundaries = state.additionalBoundaries.filter(b => b.id !== boundaryId);
    renderAdditionalBoundariesList();
    refreshAdditionalBoundaries();
    
    document.getElementById('boundaryCount').textContent = state.additionalBoundaries.length;
}

function renderAdditionalBoundariesList() {
    const list = document.getElementById('additionalBoundaries');
    list.innerHTML = '';
    
    state.additionalBoundaries.forEach(boundary => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="boundary-name">${boundary.name}</span>
            <span class="boundary-type">${boundary.type}</span>
            <button class="city-btn" title="Remove">❌</button>
        `;
        
        li.querySelector('button').addEventListener('click', () => {
            removeAdditionalBoundary(boundary.id);
        });
        
        list.appendChild(li);
    });
}

function refreshAdditionalBoundaries() {
    state.layers.additionalBoundaries.clearLayers();
    
    const style = getSecondaryBoundaryStyle();
    
    state.additionalBoundaries.forEach(boundary => {
        const layer = L.geoJSON(boundary.geojson, {
            style: style
        });
        state.layers.additionalBoundaries.addLayer(layer);
    });
}

function getSecondaryBoundaryStyle() {
    const strokeStyle = document.getElementById('secondaryStrokeStyle').value;
    let dashArray = null;
    if (strokeStyle === 'dashed') dashArray = '10, 10';
    else if (strokeStyle === 'dotted') dashArray = '3, 6';
    
    return {
        color: document.getElementById('secondaryStrokeColor').value,
        weight: parseInt(document.getElementById('secondaryStrokeWeight').value),
        opacity: 0.8,
        dashArray: dashArray,
        fill: document.getElementById('secondaryShowFill').checked,
        fillColor: document.getElementById('secondaryStrokeColor').value,
        fillOpacity: 0.1
    };
}

// ============================================
// City Management
// ============================================

function addCity(city) {
    // Check if already exists
    if (state.cities.find(c => c.id === city.id)) {
        showCity(city.id);
        showToast('City already in list', 'warning');
        return;
    }
    
    state.cities.push(city);
    renderCityList();
    showCity(city.id);
    updateCityButtons();
    
    showToast(`Added: ${city.name}`, 'success');
}

function removeCity(cityId) {
    state.cities = state.cities.filter(c => c.id !== cityId);
    renderCityList();
    updateCityButtons();
    
    if (state.activeCityId === cityId) {
        state.activeCityId = null;
        clearMapLayers();
        document.getElementById('currentCityIndicator').style.display = 'none';
        
        if (state.cities.length > 0) {
            showCity(state.cities[0].id);
        }
    }
}

function showCity(cityId) {
    const city = state.cities.find(c => c.id === cityId);
    if (!city) return;
    
    state.activeCityId = cityId;
    state.currentCity = city;
    
    // Clear previous layers
    clearMapLayers();
    
    // Update city list UI
    renderCityList();
    
    // Add mask if enabled
    if (document.getElementById('showMask').checked) {
        addMask(city.geojson);
    }
    
    // Add boundary
    const style = getBoundaryStyle();
    state.currentBoundaryLayer = L.geoJSON(city.geojson, { style });
    state.layers.boundaries.addLayer(state.currentBoundaryLayer);
    
    // Store boundary reference for data layers
    state.layers.boundary = state.currentBoundaryLayer;
    
    // Add center marker if enabled
    if (document.getElementById('showCenterMarker').checked) {
        addCenterMarker(city);
    }
    
    // Add city label if enabled
    if (document.getElementById('showCityLabel').checked) {
        addCityLabel(city);
    }
    
    // Update city indicator
    const indicator = document.getElementById('currentCityIndicator');
    const cityNameSpan = document.getElementById('currentCityName');
    cityNameSpan.textContent = city.locationSuffix 
        ? `${city.name} (${city.locationSuffix})` 
        : city.name;
    indicator.style.display = 'block';
    
    // Update title if using city name
    updateTitleBlock();
    
    // Zoom to fit
    zoomToFit();
    
    // Refresh data layers for new city
    if (state.activeLayers && state.activeLayers.size > 0) {
        refreshDataLayersForNewCity();
    }
}

function refreshCurrentCity() {
    if (state.activeCityId) {
        showCity(state.activeCityId);
    }
}

function clearMapLayers() {
    if (state.layers.mask) {
        state.map.removeLayer(state.layers.mask);
        state.layers.mask = null;
    }
    state.layers.boundaries.clearLayers();
    state.layers.markers.clearLayers();
    state.layers.labels.clearLayers();
    state.currentBoundaryLayer = null;
}

function renderCityList() {
    const list = document.getElementById('selectedCities');
    list.innerHTML = '';
    
    state.cities.forEach((city, index) => {
        const li = document.createElement('li');
        li.className = city.id === state.activeCityId ? 'active' : '';
        
        li.innerHTML = `
            <div class="city-info">
                <span class="city-number">${index + 1}.</span>
                <span class="city-name">${city.name}</span>
                ${city.locationSuffix ? `<span class="city-suffix">(${city.locationSuffix})</span>` : ''}
            </div>
            <div class="city-actions">
                <button class="city-btn show-btn" title="Show">👁️</button>
                <button class="city-btn remove-btn" title="Remove">❌</button>
            </div>
        `;
        
        li.querySelector('.show-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            showCity(city.id);
        });
        
        li.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            removeCity(city.id);
        });
        
        li.addEventListener('click', () => showCity(city.id));
        
        list.appendChild(li);
    });
    
    document.getElementById('cityCount').textContent = state.cities.length;
}

function updateCityButtons() {
    const hasCity = state.cities.length > 0;
    document.getElementById('clearAllBtn').disabled = !hasCity;
    document.getElementById('saveCityListBtn').disabled = !hasCity;
    document.getElementById('exportCurrentBtn').disabled = !hasCity;
    document.getElementById('exportAllBtn').disabled = !hasCity;
}

function clearAllCities() {
    if (!confirm('Remove all cities from the list?')) return;
    
    state.cities = [];
    state.activeCityId = null;
    clearMapLayers();
    renderCityList();
    updateCityButtons();
    document.getElementById('currentCityIndicator').style.display = 'none';
    resetView();
}

// ============================================
// City List Save/Load
// ============================================

function saveCityList() {
    if (state.cities.length === 0) {
        showToast('No cities to save', 'warning');
        return;
    }
    
    const data = {
        version: '1.1',
        savedAt: new Date().toISOString(),
        cities: state.cities.map(city => ({
            id: city.id,
            name: city.name,
            displayName: city.displayName,
            lat: city.lat,
            lon: city.lon,
            type: city.type,
            locationSuffix: city.locationSuffix,
            geojson: city.geojson,
            boundingbox: city.boundingbox
        }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const filename = `city_list_${new Date().toISOString().slice(0, 10)}.json`;
    saveAs(blob, filename);
    
    showToast(`Saved ${state.cities.length} cities`, 'success');
}

function loadCityListFromFile(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!data.cities || !Array.isArray(data.cities)) {
                throw new Error('Invalid city list format');
            }
            
            // Clear existing cities
            state.cities = [];
            clearMapLayers();
            
            // Add cities from file
            data.cities.forEach(city => {
                state.cities.push({
                    id: city.id,
                    name: city.name,
                    displayName: city.displayName,
                    lat: city.lat,
                    lon: city.lon,
                    type: city.type,
                    locationSuffix: city.locationSuffix || '',
                    geojson: city.geojson,
                    boundingbox: city.boundingbox
                });
            });
            
            renderCityList();
            updateCityButtons();
            
            if (state.cities.length > 0) {
                showCity(state.cities[0].id);
            }
            
            showToast(`Loaded ${state.cities.length} cities`, 'success');
        } catch (error) {
            console.error('Error loading city list:', error);
            showToast('Failed to load city list', 'error');
        }
    };
    
    reader.readAsText(file);
}

// ============================================
// Boundary Styling
// ============================================

function getBoundaryStyle() {
    const strokeStyle = document.getElementById('strokeStyle').value;
    let dashArray = null;
    if (strokeStyle === 'dashed') dashArray = '10, 10';
    else if (strokeStyle === 'dotted') dashArray = '3, 6';
    
    return {
        color: document.getElementById('strokeColor').value,
        weight: parseInt(document.getElementById('strokeWeight').value),
        opacity: parseInt(document.getElementById('strokeOpacity').value) / 100,
        dashArray: dashArray,
        fill: document.getElementById('showFill').checked,
        fillColor: document.getElementById('fillColor').value,
        fillOpacity: parseInt(document.getElementById('fillOpacity').value) / 100
    };
}

function addMask(geojson) {
    const maskColor = document.getElementById('maskColor').value;
    const maskOpacity = parseInt(document.getElementById('maskOpacity').value) / 100;
    
    // Create a world polygon
    const worldBounds = [
        [-90, -180],
        [-90, 180],
        [90, 180],
        [90, -180],
        [-90, -180]
    ];
    
    // Convert city geojson to coordinates for hole
    let cityCoords = [];
    
    if (geojson.type === 'Polygon') {
        cityCoords = [geojson.coordinates[0].map(c => [c[1], c[0]])];
    } else if (geojson.type === 'MultiPolygon') {
        cityCoords = geojson.coordinates.map(poly => 
            poly[0].map(c => [c[1], c[0]])
        );
    }
    
    // Create mask polygon with hole
    const maskCoords = [worldBounds, ...cityCoords];
    
    state.layers.mask = L.polygon(maskCoords, {
        color: 'transparent',
        fillColor: maskColor,
        fillOpacity: maskOpacity,
        interactive: false
    }).addTo(state.map);
}

function addCenterMarker(city) {
    const style = document.getElementById('markerStyle').value;
    const size = parseInt(document.getElementById('markerSize').value);
    const color = document.getElementById('markerColor').value;
    
    let marker;
    
    if (style === 'pin') {
        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="font-size: ${size * 2}px;">📍</div>`,
            iconSize: [size * 2, size * 2],
            iconAnchor: [size, size * 2]
        });
        marker = L.marker([city.lat, city.lon], { icon });
    } else if (style === 'circle') {
        marker = L.circleMarker([city.lat, city.lon], {
            radius: size,
            color: color,
            fillColor: color,
            fillOpacity: 0.3,
            weight: 2
        });
    } else { // dot
        marker = L.circleMarker([city.lat, city.lon], {
            radius: size / 2,
            color: color,
            fillColor: color,
            fillOpacity: 1,
            weight: 0
        });
    }
    
    state.layers.markers.addLayer(marker);
}

function addCityLabel(city) {
    const position = document.getElementById('labelPosition').value;
    const fontSize = document.getElementById('labelFontSize').value;
    const fontWeight = document.getElementById('labelFontWeight').value;
    const color = document.getElementById('labelColor').value;
    const shadow = document.getElementById('labelShadow').checked;
    const hasBg = document.getElementById('labelBackground').checked;
    const bgColor = document.getElementById('labelBgColor').value;
    const bgOpacity = parseInt(document.getElementById('labelBgOpacity').value) / 100;
    
    // Calculate label position offset
    let offset = [0, 0];
    const offsetAmount = 30;
    
    switch (position) {
        case 'top': offset = [0, -offsetAmount]; break;
        case 'bottom': offset = [0, offsetAmount]; break;
        case 'topleft': offset = [-offsetAmount, -offsetAmount]; break;
        case 'topright': offset = [offsetAmount, -offsetAmount]; break;
        case 'bottomleft': offset = [-offsetAmount, offsetAmount]; break;
        case 'bottomright': offset = [offsetAmount, offsetAmount]; break;
    }
    
    const bgColorRgba = hasBg 
        ? `background: ${hexToRgba(bgColor, bgOpacity)}; ` 
        : '';
    
    const icon = L.divIcon({
        className: 'city-label',
        html: `<div class="city-label-content ${shadow ? 'with-shadow' : ''} ${hasBg ? 'with-background' : ''}" 
                    style="font-size: ${fontSize}px; font-weight: ${fontWeight}; color: ${color}; ${bgColorRgba}">
                    ${city.name}
               </div>`,
        iconAnchor: [-offset[0], -offset[1]]
    });
    
    const label = L.marker([city.lat, city.lon], { 
        icon,
        interactive: false
    });
    
    state.layers.labels.addLayer(label);
}

// ============================================
// Title Block & Cartographic Elements
// ============================================

function updateTitleBlock() {
    const showTitle = document.getElementById('showMapTitle').checked;
    const titleText = document.getElementById('mapTitle').value;
    const subtitleText = document.getElementById('mapSubtitle').value;
    const titlePosition = document.getElementById('titlePosition').value;
    const titleFontSize = document.getElementById('titleFontSize').value;
    const titleColor = document.getElementById('titleColor').value;
    
    const titleOverlay = document.getElementById('titleBlockOverlay');
    const titleDisplay = document.getElementById('mapTitleDisplay');
    const subtitleDisplay = document.getElementById('mapSubtitleDisplay');
    
    // Use city name if no custom title
    const activeCity = state.cities.find(c => c.id === state.activeCityId);
    const displayTitle = titleText || (activeCity ? activeCity.name : '');
    
    if (showTitle && displayTitle) {
        titleDisplay.textContent = displayTitle;
        titleDisplay.style.fontSize = `${titleFontSize}px`;
        titleDisplay.style.color = titleColor;
        
        subtitleDisplay.textContent = subtitleText;
        subtitleDisplay.style.color = titleColor;
        
        // Set position class
        titleOverlay.className = `title-block-overlay ${titlePosition}`;
        titleOverlay.style.display = 'block';
    } else {
        titleOverlay.style.display = 'none';
    }
    
    // North Arrow
    updateNorthArrow();
    
    // Info overlay (date, coordinates)
    updateInfoOverlay();
}

function updateNorthArrow() {
    const showArrow = document.getElementById('showNorthArrow').checked;
    const arrowStyle = document.getElementById('northArrowStyle').value;
    const arrowPosition = document.getElementById('northArrowPosition').value;
    const arrowSize = parseInt(document.getElementById('northArrowSize').value);
    
    const arrowOverlay = document.getElementById('northArrowOverlay');
    
    if (showArrow) {
        let arrowSvg = '';
        
        if (arrowStyle === 'simple') {
            arrowSvg = `
                <svg width="${arrowSize}" height="${arrowSize}" viewBox="0 0 100 100">
                    <polygon points="50,5 65,95 50,75 35,95" fill="white" stroke="black" stroke-width="2"/>
                    <text x="50" y="45" font-size="24" font-weight="bold" text-anchor="middle" fill="black">N</text>
                </svg>
            `;
        } else if (arrowStyle === 'compass') {
            arrowSvg = `
                <svg width="${arrowSize}" height="${arrowSize}" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="white" stroke="black" stroke-width="2"/>
                    <polygon points="50,10 55,50 50,45 45,50" fill="black"/>
                    <polygon points="50,90 55,50 50,55 45,50" fill="gray"/>
                    <polygon points="10,50 50,45 45,50 50,55" fill="gray"/>
                    <polygon points="90,50 50,45 55,50 50,55" fill="gray"/>
                    <text x="50" y="28" font-size="14" font-weight="bold" text-anchor="middle" fill="black">N</text>
                    <text x="50" y="82" font-size="12" text-anchor="middle" fill="black">S</text>
                    <text x="15" y="54" font-size="12" text-anchor="middle" fill="black">W</text>
                    <text x="85" y="54" font-size="12" text-anchor="middle" fill="black">E</text>
                </svg>
            `;
        } else { // minimal
            arrowSvg = `
                <svg width="${arrowSize}" height="${arrowSize}" viewBox="0 0 60 80">
                    <text x="30" y="35" font-size="36" font-weight="bold" text-anchor="middle" fill="white" stroke="black" stroke-width="1">N</text>
                    <polygon points="30,45 25,70 30,60 35,70" fill="white" stroke="black" stroke-width="1"/>
                </svg>
            `;
        }
        
        arrowOverlay.innerHTML = arrowSvg;
        arrowOverlay.className = `north-arrow-overlay ${arrowPosition}`;
        arrowOverlay.style.display = 'block';
    } else {
        arrowOverlay.style.display = 'none';
    }
}

function updateInfoOverlay() {
    const showDate = document.getElementById('showDateStamp').checked;
    const showCoords = document.getElementById('showCoordinates').checked;
    
    const infoOverlay = document.getElementById('infoOverlay');
    
    if (showDate || showCoords) {
        let html = '';
        
        if (showDate) {
            const date = new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            html += `<div class="info-line">📅 ${date}</div>`;
        }
        
        if (showCoords && state.activeCityId) {
            const city = state.cities.find(c => c.id === state.activeCityId);
            if (city) {
                const lat = city.lat.toFixed(4);
                const lon = city.lon.toFixed(4);
                html += `<div class="info-line">📍 ${lat}°, ${lon}°</div>`;
            }
        }
        
        infoOverlay.innerHTML = html;
        infoOverlay.style.display = 'block';
    } else {
        infoOverlay.style.display = 'none';
    }
}

// ============================================
// Annotations
// ============================================

function setAnnotationTool(tool) {
    const buttons = document.querySelectorAll('.tool-btn');
    const hint = document.getElementById('annotationHint');
    
    if (state.activeAnnotationTool === tool) {
        // Deselect
        state.activeAnnotationTool = null;
        buttons.forEach(b => b.classList.remove('active'));
        hint.style.display = 'none';
        state.map.getContainer().style.cursor = '';
    } else {
        // Select
        state.activeAnnotationTool = tool;
        buttons.forEach(b => {
            b.classList.toggle('active', b.dataset.tool === tool);
        });
        hint.style.display = 'block';
        state.map.getContainer().style.cursor = 'crosshair';
    }
}

function handleMapClick(e) {
    if (!state.activeAnnotationTool) return;
    
    const latlng = e.latlng;
    const tool = state.activeAnnotationTool;
    
    // Create annotation
    const annotation = {
        id: Date.now(),
        type: tool,
        lat: latlng.lat,
        lng: latlng.lng,
        text: tool === 'marker' ? '📍' : 'Click to edit'
    };
    
    state.annotations.push(annotation);
    
    // Show edit modal for text/callout
    if (tool === 'text' || tool === 'callout') {
        state.editingAnnotationId = annotation.id;
        showAnnotationModal(annotation);
    }
    
    renderAnnotations();
    updateAnnotationList();
    
    // Clear tool
    setAnnotationTool(null);
}

function showAnnotationModal(annotation) {
    const modal = document.getElementById('annotationModal');
    const input = document.getElementById('annotationTextInput');
    
    input.value = annotation.text === 'Click to edit' ? '' : annotation.text;
    modal.style.display = 'flex';
    input.focus();
}

function closeAnnotationModal() {
    document.getElementById('annotationModal').style.display = 'none';
    state.editingAnnotationId = null;
}

function saveAnnotation() {
    const input = document.getElementById('annotationTextInput');
    const text = input.value.trim() || 'Text';
    
    const annotation = state.annotations.find(a => a.id === state.editingAnnotationId);
    if (annotation) {
        annotation.text = text;
        renderAnnotations();
        updateAnnotationList();
    }
    
    closeAnnotationModal();
}

function renderAnnotations() {
    state.layers.annotations.clearLayers();
    
    const fontSize = document.getElementById('annotationFontSize').value;
    const color = document.getElementById('annotationColor').value;
    const shadow = document.getElementById('annotationShadow').checked;
    const hasBg = document.getElementById('annotationBg').checked;
    
    state.annotations.forEach(annotation => {
        let marker;
        
        if (annotation.type === 'marker') {
            const icon = L.divIcon({
                className: 'annotation-marker',
                html: `<div class="custom-marker" style="font-size: 24px;">${annotation.text}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            });
            marker = L.marker([annotation.lat, annotation.lng], { 
                icon,
                draggable: true
            });
        } else if (annotation.type === 'callout') {
            const icon = L.divIcon({
                className: 'annotation-marker',
                html: `<div class="callout-content" style="font-size: ${fontSize}px; color: ${color};">
                        ${annotation.text}
                       </div>`,
                iconSize: [200, 50]
            });
            marker = L.marker([annotation.lat, annotation.lng], { 
                icon,
                draggable: true
            });
        } else { // text
            const bgStyle = hasBg ? 'background: rgba(31, 41, 55, 0.85);' : '';
            const icon = L.divIcon({
                className: 'annotation-marker',
                html: `<div class="annotation-content ${shadow ? 'with-shadow' : ''} ${hasBg ? 'with-background' : ''}" 
                            style="font-size: ${fontSize}px; color: ${color}; ${bgStyle}">
                            ${annotation.text}
                       </div>`,
                iconSize: [150, 30]
            });
            marker = L.marker([annotation.lat, annotation.lng], { 
                icon,
                draggable: true
            });
        }
        
        // Update position on drag
        marker.on('dragend', (e) => {
            const newPos = e.target.getLatLng();
            annotation.lat = newPos.lat;
            annotation.lng = newPos.lng;
        });
        
        // Double click to edit
        marker.on('dblclick', () => {
            if (annotation.type !== 'marker') {
                state.editingAnnotationId = annotation.id;
                showAnnotationModal(annotation);
            }
        });
        
        state.layers.annotations.addLayer(marker);
    });
}

function refreshAnnotations() {
    renderAnnotations();
}

function updateAnnotationList() {
    const list = document.getElementById('annotationList');
    list.innerHTML = '';
    
    state.annotations.forEach(annotation => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="annotation-text">${annotation.text.substring(0, 20)}${annotation.text.length > 20 ? '...' : ''}</span>
            <span class="annotation-type">${annotation.type}</span>
            <button class="city-btn" title="Remove">❌</button>
        `;
        
        li.querySelector('button').addEventListener('click', () => {
            state.annotations = state.annotations.filter(a => a.id !== annotation.id);
            renderAnnotations();
            updateAnnotationList();
        });
        
        list.appendChild(li);
    });
    
    document.getElementById('annotationCount').textContent = state.annotations.length;
    document.getElementById('clearAnnotationsBtn').disabled = state.annotations.length === 0;
}

function clearAllAnnotations() {
    if (!confirm('Remove all annotations?')) return;
    
    state.annotations = [];
    renderAnnotations();
    updateAnnotationList();
}

// ============================================
// View Controls
// ============================================

function zoomToFit() {
    if (!state.currentBoundaryLayer) return;
    
    const padding = parseInt(document.getElementById('fitPadding').value);
    const maxZoom = parseInt(document.getElementById('maxFitZoom').value);
    const animate = document.getElementById('animateTransitions').checked;
    const duration = parseInt(document.getElementById('animationDuration').value) / 1000;
    
    state.map.fitBounds(state.currentBoundaryLayer.getBounds(), {
        padding: [padding, padding],
        maxZoom: maxZoom,
        animate: animate,
        duration: duration
    });
}

function resetView() {
    const animate = document.getElementById('animateTransitions').checked;
    state.map.setView([39.8283, -98.5795], 4, { animate });
}

// ============================================
// Export Functions
// ============================================

async function exportCurrentView() {
    if (!state.activeCityId) {
        showToast('No city selected', 'warning');
        return;
    }
    
    const city = state.cities.find(c => c.id === state.activeCityId);
    if (!city) return;
    
    showToast('Preparing export...', 'success');
    
    try {
        const dataUrl = await captureMap();
        downloadImage(dataUrl, generateFilename(city));
        showToast('Export complete!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Export failed', 'error');
    }
}

async function exportAllCities() {
    if (state.cities.length === 0) {
        showToast('No cities to export', 'warning');
        return;
    }
    
    state.isExporting = true;
    state.cancelExport = false;
    
    const progressPanel = document.getElementById('progressPanel');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressPanel.style.display = 'block';
    progressFill.style.width = '0%';
    
    const zip = new JSZip();
    const batchDelay = parseInt(document.getElementById('batchDelay').value);
    const includeDataLayers = document.getElementById('includeDataLayers')?.checked ?? true;
    
    // Remember which data layers are active so we can apply them to each city
    const activeLayerTypes = includeDataLayers ? Array.from(state.activeLayers) : [];
    
    for (let i = 0; i < state.cities.length; i++) {
        if (state.cancelExport) {
            progressText.textContent = 'Export cancelled';
            break;
        }
        
        const city = state.cities[i];
        const progress = ((i + 1) / state.cities.length) * 100;
        
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Exporting ${city.name} (${i + 1}/${state.cities.length})...`;
        
        // Show city (this clears and re-adds boundary)
        showCity(city.id);
        
        // Wait for map to settle and tiles to start loading
        await delay(300);
        
        // Wait for tiles to actually load
        await waitForTilesToLoad();
        
        // If there are active data layers, fetch and render them for this city
        if (activeLayerTypes.length > 0) {
            progressText.textContent = `Loading data layers for ${city.name}...`;
            await loadDataLayersForExport(activeLayerTypes);
        }
        
        // Additional wait for rendering to complete
        await delay(batchDelay);
        
        try {
            const dataUrl = await captureMap();
            const base64Data = dataUrl.split(',')[1];
            const filename = generateFilename(city, i + 1);
            zip.file(filename, base64Data, { base64: true });
        } catch (error) {
            console.error(`Error exporting ${city.name}:`, error);
        }
    }
    
    if (!state.cancelExport) {
        progressText.textContent = 'Creating ZIP file...';
        
        try {
            const content = await zip.generateAsync({ type: 'blob' });
            const zipFilename = document.getElementById('zipFilename').value || 'city_maps';
            const timestamp = document.getElementById('includeTimestamp').checked 
                ? `_${new Date().toISOString().slice(0, 10)}` 
                : '';
            saveAs(content, `${zipFilename}${timestamp}.zip`);
            showToast(`Exported ${state.cities.length} cities`, 'success');
        } catch (error) {
            console.error('ZIP creation error:', error);
            showToast('Failed to create ZIP', 'error');
        }
    }
    
    progressPanel.style.display = 'none';
    state.isExporting = false;
}

// Wait for map tiles to finish loading
function waitForTilesToLoad() {
    return new Promise((resolve) => {
        // Check if tiles are already loaded
        let pendingTiles = 0;
        
        state.map.eachLayer((layer) => {
            if (layer._loading) {
                pendingTiles++;
            }
        });
        
        if (pendingTiles === 0) {
            // Give a bit more time for rendering
            setTimeout(resolve, 500);
            return;
        }
        
        // Wait for 'load' event with timeout
        const timeout = setTimeout(() => {
            resolve();
        }, 5000); // Max 5 second wait
        
        const onLoad = () => {
            clearTimeout(timeout);
            // Small additional delay after load event
            setTimeout(resolve, 300);
        };
        
        state.map.once('load', onLoad);
        
        // Also listen for tile layer load events
        state.map.eachLayer((layer) => {
            if (layer.once && layer._url) {
                layer.once('load', onLoad);
            }
        });
    });
}

// Load data layers for batch export
async function loadDataLayersForExport(layerTypes) {
    const bbox = getQueryBbox();
    
    // Clear existing data layers for this city
    Object.keys(state.layers.dataLayers).forEach(layerType => {
        state.map.removeLayer(state.layers.dataLayers[layerType]);
        delete state.layers.dataLayers[layerType];
    });
    
    // Fetch and render each layer type
    for (const layerType of layerTypes) {
        const layerDef = dataLayerDefs[layerType];
        if (!layerDef) continue;
        
        try {
            // Check cache first (with new bbox)
            const cacheKey = `${layerType}_${bbox.join('_')}`;
            let data = state.layerData[cacheKey];
            
            if (!data) {
                data = await fetchOverpassData(layerType, bbox);
                state.layerData[cacheKey] = data;
            }
            
            renderDataLayer(layerType, data);
        } catch (error) {
            console.error(`Error loading ${layerType} for export:`, error);
        }
    }
    
    // Wait for markers to render
    await delay(200);
}

async function captureMap() {
    const mapWrapper = document.getElementById('mapWrapper');
    const hideControls = document.getElementById('hideControlsOnExport').checked;
    const hideAttribution = document.getElementById('hideAttributionOnExport').checked;
    const hideCityIndicator = document.getElementById('hideCityIndicatorOnExport').checked;
    const scale = parseInt(document.getElementById('exportScale').value);
    const format = document.getElementById('imageFormat').value;
    const quality = parseInt(document.getElementById('imageQuality').value) / 100;
    const bgColor = document.getElementById('exportBgColor').value;
    
    // Temporarily hide elements
    const zoomControl = document.querySelector('.leaflet-control-zoom');
    const attribution = document.querySelector('.leaflet-control-attribution');
    const scaleControl = document.querySelector('.leaflet-control-scale');
    const cityIndicator = document.getElementById('currentCityIndicator');
    const mapOverlay = document.querySelector('.map-overlay.top-right');
    
    if (hideControls) {
        if (zoomControl) zoomControl.style.display = 'none';
        if (scaleControl) scaleControl.style.display = 'none';
        if (mapOverlay) mapOverlay.style.display = 'none';
    }
    
    if (hideAttribution && attribution) {
        attribution.style.display = 'none';
    }
    
    if (hideCityIndicator && cityIndicator) {
        cityIndicator.style.display = 'none';
    }
    
    // Wait for rendering
    await delay(parseInt(document.getElementById('tileLoadWait').value));
    
    // Capture
    const canvas = await html2canvas(mapWrapper, {
        scale: scale,
        backgroundColor: bgColor,
        useCORS: true,
        allowTaint: true,
        logging: false
    });
    
    // Restore elements
    if (hideControls) {
        if (zoomControl && document.getElementById('showZoomControl').checked) {
            zoomControl.style.display = 'flex';
        }
        if (scaleControl && document.getElementById('showScale').checked) {
            scaleControl.style.display = 'block';
        }
        if (mapOverlay) mapOverlay.style.display = 'flex';
    }
    
    if (hideAttribution && attribution && document.getElementById('showAttribution').checked) {
        attribution.style.display = 'block';
    }
    
    if (hideCityIndicator && cityIndicator && state.activeCityId) {
        cityIndicator.style.display = 'block';
    }
    
    // Convert to data URL
    const mimeType = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp';
    return canvas.toDataURL(mimeType, quality);
}

function generateFilename(cityOrName, index = null) {
    const prefix = document.getElementById('filenamePrefix').value || 'city_map_';
    const format = document.getElementById('imageFormat').value;
    const includeTimestamp = document.getElementById('includeTimestamp').checked;
    const includeIndex = document.getElementById('includeIndex').checked;
    
    let cityName, locationSuffix;
    
    if (typeof cityOrName === 'object') {
        cityName = cityOrName.name;
        locationSuffix = cityOrName.locationSuffix || '';
    } else {
        cityName = cityOrName;
        locationSuffix = '';
    }
    
    // Clean city name for filename
    let safeName = cityName.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Add location suffix for uniqueness
    if (locationSuffix) {
        const safeSuffix = locationSuffix.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
        safeName = `${safeName}_${safeSuffix}`;
    }
    
    let filename = prefix + safeName;
    
    if (includeIndex && index !== null) {
        filename += `_${String(index).padStart(3, '0')}`;
    }
    
    if (includeTimestamp) {
        filename += `_${new Date().toISOString().slice(0, 10)}`;
    }
    
    return `${filename}.${format}`;
}

function downloadImage(dataUrl, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
}

// ============================================
// Presets
// ============================================

const presets = {
    default: {
        mapStyle: 'osm',
        strokeColor: '#10b981',
        strokeWeight: 3,
        strokeOpacity: 100,
        strokeStyle: 'solid',
        showFill: true,
        fillColor: '#10b981',
        fillOpacity: 20,
        showMask: false,
        showCenterMarker: false
    },
    minimal: {
        mapStyle: 'cartoLight',
        strokeColor: '#374151',
        strokeWeight: 2,
        strokeOpacity: 80,
        strokeStyle: 'solid',
        showFill: false,
        showMask: false,
        showCenterMarker: false
    },
    bold: {
        mapStyle: 'osm',
        strokeColor: '#ef4444',
        strokeWeight: 5,
        strokeOpacity: 100,
        strokeStyle: 'solid',
        showFill: true,
        fillColor: '#ef4444',
        fillOpacity: 30,
        showMask: false,
        showCenterMarker: true,
        markerStyle: 'circle',
        markerColor: '#ef4444'
    },
    neon: {
        mapStyle: 'cartoDark',
        strokeColor: '#22d3ee',
        strokeWeight: 3,
        strokeOpacity: 100,
        strokeStyle: 'solid',
        showFill: true,
        fillColor: '#22d3ee',
        fillOpacity: 15,
        showMask: false,
        showCenterMarker: false
    },
    vintage: {
        mapStyle: 'stamenWatercolor',
        strokeColor: '#78350f',
        strokeWeight: 3,
        strokeOpacity: 90,
        strokeStyle: 'dashed',
        showFill: false,
        showMask: false,
        showCenterMarker: true,
        markerStyle: 'circle',
        markerColor: '#78350f'
    },
    blueprint: {
        mapStyle: 'cartoDark',
        strokeColor: '#60a5fa',
        strokeWeight: 2,
        strokeOpacity: 100,
        strokeStyle: 'dashed',
        showFill: true,
        fillColor: '#60a5fa',
        fillOpacity: 10,
        showMask: false,
        showCenterMarker: false
    },
    satellite: {
        mapStyle: 'esriWorldImagery',
        strokeColor: '#fbbf24',
        strokeWeight: 3,
        strokeOpacity: 100,
        strokeStyle: 'solid',
        showFill: false,
        showMask: false,
        showCenterMarker: false
    },
    dark: {
        mapStyle: 'cartoDark',
        strokeColor: '#a78bfa',
        strokeWeight: 3,
        strokeOpacity: 100,
        strokeStyle: 'solid',
        showFill: true,
        fillColor: '#a78bfa',
        fillOpacity: 15,
        showMask: true,
        maskColor: '#0f172a',
        maskOpacity: 80,
        showCenterMarker: false
    }
};

function applyPreset(presetName) {
    const preset = presets[presetName];
    if (!preset) return;
    
    // Apply map style
    if (preset.mapStyle) {
        document.getElementById('mapStyle').value = preset.mapStyle;
        setTileLayer(preset.mapStyle);
    }
    
    // Apply boundary settings
    if (preset.strokeColor) {
        document.getElementById('strokeColor').value = preset.strokeColor;
        document.getElementById('strokeColorText').value = preset.strokeColor;
    }
    if (preset.strokeWeight !== undefined) {
        document.getElementById('strokeWeight').value = preset.strokeWeight;
        document.getElementById('strokeWeightValue').textContent = `${preset.strokeWeight}px`;
    }
    if (preset.strokeOpacity !== undefined) {
        document.getElementById('strokeOpacity').value = preset.strokeOpacity;
        document.getElementById('strokeOpacityValue').textContent = `${preset.strokeOpacity}%`;
    }
    if (preset.strokeStyle) {
        document.getElementById('strokeStyle').value = preset.strokeStyle;
    }
    
    document.getElementById('showFill').checked = preset.showFill ?? true;
    
    if (preset.fillColor) {
        document.getElementById('fillColor').value = preset.fillColor;
        document.getElementById('fillColorText').value = preset.fillColor;
    }
    if (preset.fillOpacity !== undefined) {
        document.getElementById('fillOpacity').value = preset.fillOpacity;
        document.getElementById('fillOpacityValue').textContent = `${preset.fillOpacity}%`;
    }
    
    document.getElementById('showMask').checked = preset.showMask ?? false;
    
    if (preset.maskColor) {
        document.getElementById('maskColor').value = preset.maskColor;
        document.getElementById('maskColorText').value = preset.maskColor;
    }
    if (preset.maskOpacity !== undefined) {
        document.getElementById('maskOpacity').value = preset.maskOpacity;
        document.getElementById('maskOpacityValue').textContent = `${preset.maskOpacity}%`;
    }
    
    document.getElementById('showCenterMarker').checked = preset.showCenterMarker ?? false;
    
    if (preset.markerStyle) {
        document.getElementById('markerStyle').value = preset.markerStyle;
    }
    if (preset.markerColor) {
        document.getElementById('markerColor').value = preset.markerColor;
        document.getElementById('markerColorText').value = preset.markerColor;
    }
    
    // Refresh display
    refreshCurrentCity();
    
    showToast(`Applied "${presetName}" preset`, 'success');
}

function saveCurrentPreset() {
    const preset = {
        name: 'Custom Preset',
        savedAt: new Date().toISOString(),
        mapStyle: document.getElementById('mapStyle').value,
        strokeColor: document.getElementById('strokeColor').value,
        strokeWeight: parseInt(document.getElementById('strokeWeight').value),
        strokeOpacity: parseInt(document.getElementById('strokeOpacity').value),
        strokeStyle: document.getElementById('strokeStyle').value,
        showFill: document.getElementById('showFill').checked,
        fillColor: document.getElementById('fillColor').value,
        fillOpacity: parseInt(document.getElementById('fillOpacity').value),
        showMask: document.getElementById('showMask').checked,
        maskColor: document.getElementById('maskColor').value,
        maskOpacity: parseInt(document.getElementById('maskOpacity').value),
        showCenterMarker: document.getElementById('showCenterMarker').checked,
        markerStyle: document.getElementById('markerStyle').value,
        markerSize: parseInt(document.getElementById('markerSize').value),
        markerColor: document.getElementById('markerColor').value
    };
    
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
    const filename = `mapmaker_preset_${new Date().toISOString().slice(0, 10)}.json`;
    saveAs(blob, filename);
    
    showToast('Preset saved', 'success');
}

function loadPresetFromFile(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const preset = JSON.parse(e.target.result);
            
            // Apply loaded preset
            if (preset.mapStyle) {
                document.getElementById('mapStyle').value = preset.mapStyle;
                setTileLayer(preset.mapStyle);
            }
            
            if (preset.strokeColor) {
                document.getElementById('strokeColor').value = preset.strokeColor;
                document.getElementById('strokeColorText').value = preset.strokeColor;
            }
            if (preset.strokeWeight !== undefined) {
                document.getElementById('strokeWeight').value = preset.strokeWeight;
                document.getElementById('strokeWeightValue').textContent = `${preset.strokeWeight}px`;
            }
            if (preset.strokeOpacity !== undefined) {
                document.getElementById('strokeOpacity').value = preset.strokeOpacity;
                document.getElementById('strokeOpacityValue').textContent = `${preset.strokeOpacity}%`;
            }
            if (preset.strokeStyle) {
                document.getElementById('strokeStyle').value = preset.strokeStyle;
            }
            
            document.getElementById('showFill').checked = preset.showFill ?? true;
            
            if (preset.fillColor) {
                document.getElementById('fillColor').value = preset.fillColor;
                document.getElementById('fillColorText').value = preset.fillColor;
            }
            if (preset.fillOpacity !== undefined) {
                document.getElementById('fillOpacity').value = preset.fillOpacity;
                document.getElementById('fillOpacityValue').textContent = `${preset.fillOpacity}%`;
            }
            
            document.getElementById('showMask').checked = preset.showMask ?? false;
            
            if (preset.maskColor) {
                document.getElementById('maskColor').value = preset.maskColor;
                document.getElementById('maskColorText').value = preset.maskColor;
            }
            if (preset.maskOpacity !== undefined) {
                document.getElementById('maskOpacity').value = preset.maskOpacity;
                document.getElementById('maskOpacityValue').textContent = `${preset.maskOpacity}%`;
            }
            
            document.getElementById('showCenterMarker').checked = preset.showCenterMarker ?? false;
            
            if (preset.markerStyle) {
                document.getElementById('markerStyle').value = preset.markerStyle;
            }
            if (preset.markerSize !== undefined) {
                document.getElementById('markerSize').value = preset.markerSize;
                document.getElementById('markerSizeValue').textContent = `${preset.markerSize}px`;
            }
            if (preset.markerColor) {
                document.getElementById('markerColor').value = preset.markerColor;
                document.getElementById('markerColorText').value = preset.markerColor;
            }
            
            refreshCurrentCity();
            showToast('Preset loaded', 'success');
        } catch (error) {
            console.error('Error loading preset:', error);
            showToast('Failed to load preset', 'error');
        }
    };
    
    reader.readAsText(file);
}

// ============================================
// Utility Functions
// ============================================

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function showToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ============================================
// Data Layers (Overpass API)
// ============================================

function setupDataLayerListeners() {
    // Set up listeners for all layer checkboxes
    document.querySelectorAll('.layer-toggle input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const layerType = e.target.dataset.layer;
            if (e.target.checked) {
                enableDataLayer(layerType);
            } else {
                disableDataLayer(layerType);
            }
        });
    });
    
    // Marker size slider
    const markerSizeSlider = document.getElementById('layerMarkerSize');
    if (markerSizeSlider) {
        markerSizeSlider.addEventListener('input', (e) => {
            document.getElementById('layerMarkerSizeValue').textContent = `${e.target.value}px`;
            updateAllLayerMarkerSizes(parseInt(e.target.value));
        });
    }
    
    // Show labels checkbox
    const showLabels = document.getElementById('showLayerLabels');
    if (showLabels) {
        showLabels.addEventListener('change', (e) => {
            toggleLayerLabels(e.target.checked);
        });
    }
    
    // Cluster markers checkbox
    const clusterMarkers = document.getElementById('clusterMarkers');
    if (clusterMarkers) {
        clusterMarkers.addEventListener('change', (e) => {
            refreshAllLayers();
        });
    }
    
    // Clear all layers button
    const clearBtn = document.getElementById('clearAllLayers');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllDataLayers);
    }
    
    // Refresh layers button
    const refreshBtn = document.getElementById('refreshLayers');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (state.activeLayers.size === 0) {
                showToast('No active layers to refresh', 'error');
                return;
            }
            refreshDataLayersForNewCity();
            showToast('Refreshing layers...', 'success');
        });
    }
}

async function enableDataLayer(layerType) {
    if (!state.currentCity) {
        showToast('Please select a city first', 'error');
        // Uncheck the checkbox
        const checkbox = document.querySelector(`input[data-layer="${layerType}"]`);
        if (checkbox) checkbox.checked = false;
        return;
    }
    
    const layerDef = dataLayerDefs[layerType];
    if (!layerDef) {
        console.error(`Unknown layer type: ${layerType}`);
        return;
    }
    
    state.activeLayers.add(layerType);
    
    // Show loading indicator
    showLayerLoading(layerType, true);
    
    try {
        // Get bbox from current city boundary or map bounds
        const bbox = getQueryBbox();
        
        // Check cache first
        const cacheKey = `${layerType}_${bbox.join('_')}`;
        let data = state.layerData[cacheKey];
        
        if (!data) {
            data = await fetchOverpassData(layerType, bbox);
            state.layerData[cacheKey] = data;
        }
        
        // Render the layer
        renderDataLayer(layerType, data);
        
        const count = data.elements?.length || 0;
        showToast(`Loaded ${count} ${layerType.replace(/_/g, ' ')}`, 'success');
        
    } catch (error) {
        console.error(`Error loading ${layerType}:`, error);
        showToast(`Failed to load ${layerType}`, 'error');
        state.activeLayers.delete(layerType);
        
        // Uncheck the checkbox
        const checkbox = document.querySelector(`input[data-layer="${layerType}"]`);
        if (checkbox) checkbox.checked = false;
    } finally {
        showLayerLoading(layerType, false);
    }
}

function disableDataLayer(layerType) {
    state.activeLayers.delete(layerType);
    
    // Remove layer from map
    if (state.layers.dataLayers[layerType]) {
        state.map.removeLayer(state.layers.dataLayers[layerType]);
        delete state.layers.dataLayers[layerType];
    }
}

function getQueryBbox() {
    // If we have a city boundary, use its bounds
    if (state.layers.boundary) {
        const bounds = state.layers.boundary.getBounds();
        return [
            bounds.getSouth(),
            bounds.getWest(),
            bounds.getNorth(),
            bounds.getEast()
        ];
    }
    
    // Otherwise use map viewport
    const bounds = state.map.getBounds();
    return [
        bounds.getSouth(),
        bounds.getWest(),
        bounds.getNorth(),
        bounds.getEast()
    ];
}

async function fetchOverpassData(layerType, bbox) {
    const layerDef = dataLayerDefs[layerType];
    if (!layerDef) {
        throw new Error(`Unknown layer type: ${layerType}`);
    }
    
    const [south, west, north, east] = bbox;
    const bboxStr = `${south},${west},${north},${east}`;
    
    // Build Overpass query
    const query = `
        [out:json][timeout:30];
        (
            ${layerDef.query.split(';').filter(q => q.trim()).map(q => q.trim() + `(${bboxStr});`).join('\n            ')}
        );
        out center;
    `;
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
    
    if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
    }
    
    return await response.json();
}

function renderDataLayer(layerType, data) {
    const layerDef = dataLayerDefs[layerType];
    if (!layerDef) return;
    
    // Remove existing layer
    if (state.layers.dataLayers[layerType]) {
        state.map.removeLayer(state.layers.dataLayers[layerType]);
    }
    
    const markers = [];
    const markerSize = parseInt(document.getElementById('layerMarkerSize')?.value || 24);
    const showLabels = document.getElementById('showLayerLabels')?.checked || false;
    const useClustering = document.getElementById('clusterMarkers')?.checked || false;
    
    if (!data.elements) return;
    
    data.elements.forEach(element => {
        let lat, lon, name;
        
        // Get coordinates
        if (element.type === 'node') {
            lat = element.lat;
            lon = element.lon;
        } else if (element.center) {
            lat = element.center.lat;
            lon = element.center.lon;
        } else {
            return; // Skip if no coordinates
        }
        
        // Get name
        name = element.tags?.name || element.tags?.operator || '';
        
        // Create custom icon
        const icon = L.divIcon({
            className: 'poi-marker',
            html: `<div class="poi-icon" style="background-color: ${layerDef.color}; width: ${markerSize}px; height: ${markerSize}px; font-size: ${markerSize * 0.6}px;">${layerDef.icon}</div>${showLabels && name ? `<div class="poi-label">${name}</div>` : ''}`,
            iconSize: [markerSize, markerSize],
            iconAnchor: [markerSize / 2, markerSize / 2]
        });
        
        const marker = L.marker([lat, lon], { icon });
        
        // Add popup with details
        const popupContent = createPoiPopup(element, layerType, layerDef);
        marker.bindPopup(popupContent);
        
        markers.push(marker);
    });
    
    // Create layer group or cluster group
    let layerGroup;
    
    if (useClustering && markers.length > 50) {
        // Simple clustering using Leaflet.markercluster if available, otherwise use layer group
        if (typeof L.markerClusterGroup === 'function') {
            layerGroup = L.markerClusterGroup({
                maxClusterRadius: 50,
                iconCreateFunction: (cluster) => {
                    const count = cluster.getChildCount();
                    let size = 'small';
                    if (count > 50) size = 'large';
                    else if (count > 20) size = 'medium';
                    
                    return L.divIcon({
                        html: `<div class="marker-cluster marker-cluster-${size}" style="background-color: ${layerDef.color}"><span>${count}</span></div>`,
                        className: '',
                        iconSize: [40, 40]
                    });
                }
            });
            markers.forEach(m => layerGroup.addLayer(m));
        } else {
            // Fallback to simple layer group
            layerGroup = L.layerGroup(markers);
        }
    } else {
        layerGroup = L.layerGroup(markers);
    }
    
    layerGroup.addTo(state.map);
    state.layers.dataLayers[layerType] = layerGroup;
}

function createPoiPopup(element, layerType, layerDef) {
    const tags = element.tags || {};
    let html = `<div class="poi-popup">`;
    html += `<h4>${layerDef.icon} ${tags.name || layerType.replace(/_/g, ' ')}</h4>`;
    
    // Add relevant details based on available tags
    const details = [];
    
    if (tags.address || tags['addr:street']) {
        const addr = tags.address || `${tags['addr:housenumber'] || ''} ${tags['addr:street'] || ''}`.trim();
        if (addr) details.push(`📍 ${addr}`);
    }
    
    if (tags.phone || tags['contact:phone']) {
        details.push(`📞 ${tags.phone || tags['contact:phone']}`);
    }
    
    if (tags.website || tags['contact:website']) {
        const url = tags.website || tags['contact:website'];
        details.push(`🔗 <a href="${url}" target="_blank">Website</a>`);
    }
    
    if (tags.opening_hours) {
        details.push(`🕐 ${tags.opening_hours}`);
    }
    
    if (tags.operator) {
        details.push(`🏢 ${tags.operator}`);
    }
    
    if (tags.cuisine) {
        details.push(`🍴 ${tags.cuisine}`);
    }
    
    if (tags.capacity) {
        details.push(`👥 Capacity: ${tags.capacity}`);
    }
    
    if (details.length > 0) {
        html += `<div class="poi-details">${details.join('<br>')}</div>`;
    }
    
    // OSM link
    html += `<div class="poi-osm-link"><a href="https://www.openstreetmap.org/${element.type}/${element.id}" target="_blank">View on OSM</a></div>`;
    
    html += `</div>`;
    return html;
}

function showLayerLoading(layerType, show) {
    const checkbox = document.querySelector(`input[data-layer="${layerType}"]`);
    if (!checkbox) return;
    
    const toggle = checkbox.closest('.layer-toggle');
    if (!toggle) return;
    
    let indicator = toggle.querySelector('.loading-indicator');
    
    if (show) {
        if (!indicator) {
            indicator = document.createElement('span');
            indicator.className = 'loading-indicator';
            indicator.innerHTML = '<span class="spinner"></span>';
            toggle.appendChild(indicator);
        }
    } else {
        if (indicator) {
            indicator.remove();
        }
    }
}

function updateAllLayerMarkerSizes(size) {
    // Re-render all active layers with new marker size
    state.activeLayers.forEach(layerType => {
        const bbox = getQueryBbox();
        const cacheKey = `${layerType}_${bbox.join('_')}`;
        const data = state.layerData[cacheKey];
        
        if (data) {
            renderDataLayer(layerType, data);
        }
    });
}

function toggleLayerLabels(show) {
    // Re-render all active layers
    state.activeLayers.forEach(layerType => {
        const bbox = getQueryBbox();
        const cacheKey = `${layerType}_${bbox.join('_')}`;
        const data = state.layerData[cacheKey];
        
        if (data) {
            renderDataLayer(layerType, data);
        }
    });
}

function refreshAllLayers() {
    state.activeLayers.forEach(layerType => {
        const bbox = getQueryBbox();
        const cacheKey = `${layerType}_${bbox.join('_')}`;
        const data = state.layerData[cacheKey];
        
        if (data) {
            renderDataLayer(layerType, data);
        }
    });
}

function clearAllDataLayers() {
    // Remove all data layers from map
    Object.keys(state.layers.dataLayers).forEach(layerType => {
        state.map.removeLayer(state.layers.dataLayers[layerType]);
        delete state.layers.dataLayers[layerType];
    });
    
    // Clear active layers set
    state.activeLayers.clear();
    
    // Uncheck all layer checkboxes
    document.querySelectorAll('.layer-toggle input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Clear cache
    state.layerData = {};
    
    showToast('All layers cleared', 'success');
}

// Refresh data layers when city changes
function refreshDataLayersForNewCity() {
    // Clear cache for old city
    state.layerData = {};
    
    // Re-fetch and render all active layers
    const activeLayers = Array.from(state.activeLayers);
    
    // Clear existing layers
    Object.keys(state.layers.dataLayers).forEach(layerType => {
        state.map.removeLayer(state.layers.dataLayers[layerType]);
        delete state.layers.dataLayers[layerType];
    });
    
    // Re-enable active layers (will fetch fresh data)
    activeLayers.forEach(layerType => {
        enableDataLayer(layerType);
    });
}
