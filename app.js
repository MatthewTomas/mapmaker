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
// Census Data Variables (ACS 5-Year Estimates)
// ============================================

const censusVariables = {
    // Population & Demographics
    total_population: {
        name: 'Total Population',
        variable: 'B01003_001E',
        category: 'demographics',
        format: 'number',
        icon: '👥'
    },
    median_age: {
        name: 'Median Age',
        variable: 'B01002_001E',
        category: 'demographics',
        format: 'decimal',
        unit: 'years',
        icon: '📅'
    },
    population_density: {
        name: 'Population Density',
        variable: 'B01003_001E', // Calculated with area
        category: 'demographics',
        format: 'density',
        unit: 'per sq mi',
        icon: '📊',
        calculated: true
    },
    
    // Race & Ethnicity
    white_population: {
        name: 'White Population',
        variable: 'B02001_002E',
        category: 'race',
        format: 'number',
        icon: '👤'
    },
    black_population: {
        name: 'Black/African American',
        variable: 'B02001_003E',
        category: 'race',
        format: 'number',
        icon: '👤'
    },
    asian_population: {
        name: 'Asian Population',
        variable: 'B02001_005E',
        category: 'race',
        format: 'number',
        icon: '👤'
    },
    hispanic_population: {
        name: 'Hispanic/Latino',
        variable: 'B03003_003E',
        category: 'race',
        format: 'number',
        icon: '👤'
    },
    
    // Housing
    total_housing_units: {
        name: 'Total Housing Units',
        variable: 'B25001_001E',
        category: 'housing',
        format: 'number',
        icon: '🏠'
    },
    median_home_value: {
        name: 'Median Home Value',
        variable: 'B25077_001E',
        category: 'housing',
        format: 'currency',
        icon: '💰'
    },
    median_rent: {
        name: 'Median Rent',
        variable: 'B25064_001E',
        category: 'housing',
        format: 'currency',
        icon: '🏢'
    },
    vacancy_rate: {
        name: 'Vacancy Rate',
        variables: ['B25002_003E', 'B25002_001E'], // Vacant / Total
        category: 'housing',
        format: 'percent',
        icon: '🚪',
        calculated: true
    },
    owner_occupied: {
        name: 'Owner-Occupied',
        variable: 'B25003_002E',
        category: 'housing',
        format: 'number',
        icon: '🔑'
    },
    renter_occupied: {
        name: 'Renter-Occupied',
        variable: 'B25003_003E',
        category: 'housing',
        format: 'number',
        icon: '📋'
    },
    
    // Income & Poverty
    median_household_income: {
        name: 'Median Household Income',
        variable: 'B19013_001E',
        category: 'income',
        format: 'currency',
        icon: '💵'
    },
    per_capita_income: {
        name: 'Per Capita Income',
        variable: 'B19301_001E',
        category: 'income',
        format: 'currency',
        icon: '💳'
    },
    poverty_rate: {
        name: 'Poverty Rate',
        variables: ['B17001_002E', 'B17001_001E'], // Below poverty / Total
        category: 'income',
        format: 'percent',
        icon: '📉',
        calculated: true
    },
    
    // Education
    bachelors_degree: {
        name: "Bachelor's Degree or Higher",
        variable: 'B15003_022E', // Need sum of 22-25
        category: 'education',
        format: 'number',
        icon: '🎓'
    },
    high_school_graduate: {
        name: 'High School Graduate+',
        variable: 'B15003_017E',
        category: 'education',
        format: 'number',
        icon: '📚'
    },
    
    // Employment
    labor_force: {
        name: 'Labor Force',
        variable: 'B23025_002E',
        category: 'employment',
        format: 'number',
        icon: '💼'
    },
    employed: {
        name: 'Employed',
        variable: 'B23025_004E',
        category: 'employment',
        format: 'number',
        icon: '👔'
    },
    unemployed: {
        name: 'Unemployed',
        variable: 'B23025_005E',
        category: 'employment',
        format: 'number',
        icon: '📊'
    },
    unemployment_rate: {
        name: 'Unemployment Rate',
        variables: ['B23025_005E', 'B23025_002E'], // Unemployed / Labor Force
        category: 'employment',
        format: 'percent',
        icon: '📈',
        calculated: true
    },
    
    // Transportation
    commute_time: {
        name: 'Mean Commute Time',
        variable: 'B08135_001E',
        category: 'transportation',
        format: 'decimal',
        unit: 'min',
        icon: '🚗'
    },
    work_from_home: {
        name: 'Work From Home',
        variable: 'B08301_021E',
        category: 'transportation',
        format: 'number',
        icon: '🏠'
    },
    public_transit: {
        name: 'Public Transit Commuters',
        variable: 'B08301_010E',
        category: 'transportation',
        format: 'number',
        icon: '🚌'
    },
    
    // Health Insurance
    insured: {
        name: 'With Health Insurance',
        variable: 'B27001_004E',
        category: 'health',
        format: 'number',
        icon: '🏥'
    },
    uninsured: {
        name: 'Without Health Insurance',
        variable: 'B27001_005E',
        category: 'health',
        format: 'number',
        icon: '❌'
    }
};

// Census data cache
state.censusData = {};

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
    setupCensusListeners();
    setupChoroplethListeners();
});

function initializeMap() {
    state.map = L.map('map', {
        center: [39.8283, -98.5795], // Center of US
        zoom: 4,
        zoomControl: true,
        preferCanvas: true  // Use Canvas renderer instead of SVG for better export compatibility
    });

    // Add default tile layer
    setTileLayer('osm');
    
    // Add scale control
    state.scaleControl = L.control.scale({
        position: 'bottomright',
        imperial: true,
        metric: true
    }).addTo(state.map);
    
    // Create custom pane for choropleth (below overlay pane z=400, above tile pane z=200)
    state.map.createPane('choroplethPane');
    state.map.getPane('choroplethPane').style.zIndex = 350;
    state.map.getPane('choroplethPane').style.pointerEvents = 'auto';
    
    // Disable pointer-events on the overlay pane so the choropleth SVG can receive
    // mouse events. With preferCanvas:true, the overlay pane holds a <canvas> element
    // that covers the full map and blocks all clicks/hovers on layers below it, even
    // if individual shapes are interactive:false. The boundary/mask layers in the
    // overlay pane don't need to be interactive.
    state.map.getPane('overlayPane').style.pointerEvents = 'none';
    
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
    
    // CSV Import/Export
    document.getElementById('downloadCsvTemplateBtn').addEventListener('click', downloadCsvTemplate);
    document.getElementById('importCsvBtn').addEventListener('click', () => {
        document.getElementById('csvFileInput').click();
    });
    document.getElementById('csvFileInput').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            importCitiesFromCsv(e.target.files[0]);
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
    
    // Setup collapsible subsections
    const subsections = document.querySelectorAll('.collapsible-subsection');
    subsections.forEach(subsection => {
        const header = subsection.querySelector('.subsection-header');
        const subsectionId = subsection.dataset.subsection;
        
        if (header) {
            // Load saved state
            const savedState = localStorage.getItem(`subsection_${subsectionId}`);
            if (savedState === 'collapsed') {
                subsection.classList.add('collapsed');
            }
            
            header.addEventListener('click', () => {
                subsection.classList.toggle('collapsed');
                
                // Save state
                const isCollapsed = subsection.classList.contains('collapsed');
                localStorage.setItem(`subsection_${subsectionId}`, isCollapsed ? 'collapsed' : 'expanded');
            });
        }
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
                    osmId: result.osm_id,
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
    
    // Clear choropleth when switching cities
    clearCensusChoropleth();
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
    const fileName = file.name.toLowerCase();
    
    // Route to appropriate loader based on file extension
    if (fileName.endsWith('.csv')) {
        importCitiesFromCsv(file);
        return;
    }
    
    // Handle JSON files
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
            showToast('Failed to load city list. Make sure it\'s a valid JSON or CSV file.', 'error');
        }
    };
    
    reader.readAsText(file);
}

// ============================================
// CSV Import/Export Functions
// ============================================

function downloadCsvTemplate() {
    const templateCsv = `city_name,state_or_region,country,notes
"New York City",New York,USA,Example city
"Los Angeles",California,USA,
"Chicago",Illinois,USA,
"Houston",Texas,USA,
"Phoenix",Arizona,USA,
"Philadelphia",Pennsylvania,USA,
"San Antonio",Texas,USA,
"San Diego",California,USA,
"Dallas",Texas,USA,
"San Jose",California,USA,`;

    const blob = new Blob([templateCsv], { type: 'text/csv' });
    saveAs(blob, 'city_list_template.csv');
    showToast('Template downloaded', 'success');
}

async function importCitiesFromCsv(file) {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const csvText = e.target.result;
            const lines = csvText.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                showToast('CSV file is empty or has no data rows', 'error');
                return;
            }
            
            // Parse header
            const header = parseCSVLine(lines[0]);
            const cityNameIdx = header.findIndex(h => h.toLowerCase().includes('city'));
            const stateIdx = header.findIndex(h => h.toLowerCase().includes('state') || h.toLowerCase().includes('region'));
            const countryIdx = header.findIndex(h => h.toLowerCase().includes('country'));
            
            if (cityNameIdx === -1) {
                showToast('CSV must have a city_name column', 'error');
                return;
            }
            
            const progressPanel = document.getElementById('progressPanel');
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');
            
            progressPanel.style.display = 'block';
            progressFill.style.width = '0%';
            
            const dataRows = lines.slice(1);
            let successCount = 0;
            let failCount = 0;
            
            for (let i = 0; i < dataRows.length; i++) {
                const row = parseCSVLine(dataRows[i]);
                if (!row[cityNameIdx]) continue;
                
                const cityName = row[cityNameIdx].trim();
                const stateName = stateIdx !== -1 ? row[stateIdx]?.trim() : '';
                const countryName = countryIdx !== -1 ? row[countryIdx]?.trim() : '';
                
                const progress = ((i + 1) / dataRows.length) * 100;
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `Searching for ${cityName}${stateName ? ', ' + stateName : ''}... (${i + 1}/${dataRows.length})`;
                
                // Build search query
                let searchQuery = cityName;
                if (stateName) searchQuery += `, ${stateName}`;
                if (countryName) searchQuery += `, ${countryName}`;
                
                try {
                    // Search for the city
                    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&polygon_geojson=1&limit=5`;
                    const response = await fetch(url, {
                        headers: { 'User-Agent': 'MapMaker/1.2' }
                    });
                    const results = await response.json();
                    
                    // Find first result with polygon boundary
                    const cityResult = results.find(r => 
                        r.geojson && 
                        (r.geojson.type === 'Polygon' || r.geojson.type === 'MultiPolygon')
                    );
                    
                    if (cityResult) {
                        // Check if already added
                        const exists = state.cities.some(c => c.osmId === cityResult.osm_id);
                        if (!exists) {
                            const newCity = {
                                id: Date.now() + Math.random(),
                                osmId: cityResult.osm_id,
                                name: cityName,
                                displayName: cityResult.display_name,
                                lat: parseFloat(cityResult.lat),
                                lon: parseFloat(cityResult.lon),
                                type: cityResult.type,
                                locationSuffix: stateName || extractLocationSuffixFromDisplayName(cityResult.display_name, cityName),
                                geojson: cityResult.geojson,
                                boundingbox: cityResult.boundingbox
                            };
                            state.cities.push(newCity);
                            successCount++;
                        }
                    } else {
                        console.warn(`No boundary found for: ${searchQuery}`);
                        failCount++;
                    }
                    
                    // Rate limiting for Nominatim API
                    await delay(1100);
                    
                } catch (error) {
                    console.error(`Error searching for ${searchQuery}:`, error);
                    failCount++;
                }
            }
            
            progressPanel.style.display = 'none';
            
            renderCityList();
            updateCityButtons();
            
            if (state.cities.length > 0 && !state.activeCityId) {
                showCity(state.cities[0].id);
            }
            
            showToast(`Imported ${successCount} cities${failCount > 0 ? `, ${failCount} not found` : ''}`, failCount > 0 ? 'warning' : 'success');
            
        } catch (error) {
            console.error('Error importing CSV:', error);
            showToast('Failed to import CSV', 'error');
            document.getElementById('progressPanel').style.display = 'none';
        }
    };
    
    reader.readAsText(file);
}

// Parse CSV line handling quoted values
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// Extract location suffix from display name (for CSV import)
function extractLocationSuffixFromDisplayName(displayName, cityName) {
    const parts = displayName.split(',');
    if (parts.length >= 2) {
        // Try to get state/region (usually 2nd or 3rd part)
        for (let i = 1; i < Math.min(parts.length, 3); i++) {
            const part = parts[i].trim();
            if (part && part.toLowerCase() !== cityName.toLowerCase()) {
                return part;
            }
        }
    }
    return '';
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
    
    const includeReport = document.getElementById('includeExportReport')?.checked ?? true;
    const includeCensus = document.getElementById('includeCensusInExport')?.checked ?? true;
    
    showToast('Preparing export...', 'success');
    
    try {
        // Capture the map image
        const dataUrl = await captureMap();
        downloadImage(dataUrl, generateFilename(city));
        
        // Generate CSV report if enabled
        if (includeReport) {
            const mapStyle = document.getElementById('mapStyle').value;
            const reportRow = {
                index: 1,
                name: city.name,
                displayName: city.displayName || '',
                lat: city.lat.toFixed(6),
                lng: city.lng.toFixed(6),
                zoom: state.map.getZoom(),
                boundaryType: city.boundaryType || 'none',
                osmId: city.osmId || '',
                mapStyle: mapStyle,
                dataLayers: Array.from(state.activeLayers).join('; '),
                exportTime: new Date().toISOString()
            };
            
            // Add Census data if enabled
            if (includeCensus) {
                const selectedCensusVars = getSelectedCensusVariables();
                if (selectedCensusVars.length > 0) {
                    try {
                        const censusData = await fetchCensusDataForCity(city);
                        if (censusData) {
                            for (const varName of selectedCensusVars) {
                                const def = censusVariables[varName];
                                if (def && censusData[varName] !== undefined) {
                                    reportRow[`census_${varName}`] = censusData[varName];
                                }
                            }
                            reportRow.census_status = 'success';
                        } else {
                            reportRow.census_status = 'not_found';
                        }
                    } catch (err) {
                        console.error('Census fetch error:', err);
                        reportRow.census_status = 'error';
                    }
                }
            }
            
            // Generate CSV
            const headers = Object.keys(reportRow);
            const csvContent = [
                headers.join(','),
                headers.map(h => {
                    const val = reportRow[h];
                    if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                        return `"${val.replace(/"/g, '""')}"`;
                    }
                    return val ?? '';
                }).join(',')
            ].join('\n');
            
            // Download CSV
            const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            const csvUrl = URL.createObjectURL(csvBlob);
            const csvFilename = generateFilename(city).replace(/\.(png|jpg|jpeg|webp)$/, '_report.csv');
            const csvLink = document.createElement('a');
            csvLink.download = csvFilename;
            csvLink.href = csvUrl;
            csvLink.click();
            URL.revokeObjectURL(csvUrl);
        }
        
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
    const includeReport = document.getElementById('includeExportReport')?.checked ?? true;
    const includeCensus = document.getElementById('includeCensusInExport')?.checked ?? true;
    const showCensusOverlay = document.getElementById('showCensusOverlay')?.checked ?? false;
    
    // Remember which data layers are active so we can apply them to each city
    const activeLayerTypes = includeDataLayers ? Array.from(state.activeLayers) : [];
    const selectedCensusVars = includeCensus ? getSelectedCensusVariables() : [];
    
    // Export report data
    const exportReport = [];
    const exportStartTime = new Date();
    const mapStyle = document.getElementById('mapStyle').value;
    
    for (let i = 0; i < state.cities.length; i++) {
        if (state.cancelExport) {
            progressText.textContent = 'Export cancelled';
            break;
        }
        
        const city = state.cities[i];
        const progress = ((i + 1) / state.cities.length) * 100;
        
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Exporting ${city.name} (${i + 1}/${state.cities.length})...`;
        
        const cityExportStart = Date.now();
        const reportEntry = {
            index: i + 1,
            city_name: city.name,
            state_region: city.locationSuffix || '',
            osm_id: city.osmId || '',
            filename: '',
            status: 'success',
            error_message: '',
            data_layers: activeLayerTypes.join(', '),
            data_layers_loaded: [],
            data_layers_failed: [],
            map_style: mapStyle,
            export_time_ms: 0,
            census_data: {}
        };
        
        // Show city (this clears and re-adds boundary)
        showCity(city.id);
        
        // Wait for map to settle and tiles to start loading
        await delay(300);
        
        // Wait for tiles to actually load
        await waitForTilesToLoad();
        
        // If there are active data layers, fetch and render them for this city
        if (activeLayerTypes.length > 0) {
            progressText.textContent = `Loading data layers for ${city.name}...`;
            const layerResults = await loadDataLayersForExportWithReport(activeLayerTypes);
            reportEntry.data_layers_loaded = layerResults.loaded;
            reportEntry.data_layers_failed = layerResults.failed;
        }
        
        // Fetch Census data if enabled
        if (includeCensus && selectedCensusVars.length > 0) {
            progressText.textContent = `Fetching Census data for ${city.name}...`;
            try {
                const censusData = await fetchCensusDataForCity(city);
                if (censusData) {
                    reportEntry.census_data = getCensusDataForExportRow(city.id);
                    // Update overlay if enabled
                    if (showCensusOverlay) {
                        updateCensusOverlay();
                    }
                }
            } catch (error) {
                console.log('Census fetch failed for', city.name, error);
            }
        }
        
        // Additional wait for rendering to complete
        await delay(batchDelay);
        
        try {
            const dataUrl = await captureMap();
            const base64Data = dataUrl.split(',')[1];
            const filename = generateFilename(city, i + 1);
            zip.file(filename, base64Data, { base64: true });
            reportEntry.filename = filename;
            reportEntry.status = 'success';
        } catch (error) {
            console.error(`Error exporting ${city.name}:`, error);
            reportEntry.status = 'failed';
            reportEntry.error_message = error.message || 'Unknown error during capture';
        }
        
        reportEntry.export_time_ms = Date.now() - cityExportStart;
        exportReport.push(reportEntry);
    }
    
    // Remove census overlay after export
    removeCensusOverlay();
    
    if (!state.cancelExport) {
        progressText.textContent = 'Creating ZIP file...';
        
        try {
            // Add export report CSV to ZIP if enabled
            if (includeReport) {
                const reportCsv = generateExportReportCsv(exportReport, exportStartTime, activeLayerTypes, selectedCensusVars);
                zip.file('export_report.csv', reportCsv);
            }
            
            const content = await zip.generateAsync({ type: 'blob' });
            const zipFilename = document.getElementById('zipFilename').value || 'city_maps';
            const timestamp = document.getElementById('includeTimestamp').checked 
                ? `_${new Date().toISOString().slice(0, 10)}` 
                : '';
            saveAs(content, `${zipFilename}${timestamp}.zip`);
            
            const successCount = exportReport.filter(r => r.status === 'success').length;
            const failCount = exportReport.filter(r => r.status === 'failed').length;
            showToast(`Exported ${successCount} cities${failCount > 0 ? `, ${failCount} failed` : ''}`, failCount > 0 ? 'warning' : 'success');
        } catch (error) {
            console.error('ZIP creation error:', error);
            showToast('Failed to create ZIP', 'error');
        }
    }
    
    progressPanel.style.display = 'none';
    state.isExporting = false;
}

// Load data layers with reporting for batch export
async function loadDataLayersForExportWithReport(layerTypes) {
    const bbox = getQueryBbox();
    const results = { loaded: [], failed: [] };
    
    // Clear existing data layers for this city
    Object.keys(state.layers.dataLayers).forEach(layerType => {
        state.map.removeLayer(state.layers.dataLayers[layerType]);
        delete state.layers.dataLayers[layerType];
    });
    
    // Fetch and render each layer type
    for (const layerType of layerTypes) {
        const layerDef = dataLayerDefs[layerType];
        if (!layerDef) {
            results.failed.push(layerType);
            continue;
        }
        
        try {
            const cacheKey = `${layerType}_${bbox.join('_')}`;
            let data = state.layerData[cacheKey];
            
            if (!data) {
                data = await fetchOverpassData(layerType, bbox);
                state.layerData[cacheKey] = data;
            }
            
            renderDataLayer(layerType, data);
            results.loaded.push(`${layerType}(${data.elements?.length || 0})`);
        } catch (error) {
            console.error(`Error loading ${layerType} for export:`, error);
            results.failed.push(layerType);
        }
    }
    
    // Wait for markers to render
    await delay(200);
    
    return results;
}

// Generate CSV report for export
function generateExportReportCsv(reportData, startTime, activeLayers, censusVars = []) {
    // Base headers
    const headers = [
        'index',
        'city_name',
        'state_region',
        'osm_id',
        'filename',
        'status',
        'error_message',
        'data_layers_requested',
        'data_layers_loaded',
        'data_layers_failed',
        'map_style',
        'export_time_ms'
    ];
    
    // Add Census variable headers
    const censusHeaders = censusVars.map(v => `census_${v}`);
    const allHeaders = [...headers, ...censusHeaders];
    
    const rows = reportData.map(entry => {
        const baseRow = [
            entry.index,
            `"${entry.city_name}"`,
            `"${entry.state_region}"`,
            entry.osm_id,
            `"${entry.filename}"`,
            entry.status,
            `"${entry.error_message}"`,
            `"${entry.data_layers}"`,
            `"${entry.data_layers_loaded.join('; ')}"`,
            `"${entry.data_layers_failed.join('; ')}"`,
            entry.map_style,
            entry.export_time_ms
        ];
        
        // Add Census data values
        const censusRow = censusVars.map(v => {
            const val = entry.census_data?.[`census_${v}`];
            return val !== undefined && val !== null ? val : '';
        });
        
        return [...baseRow, ...censusRow].join(',');
    });
    
    // Add summary at end
    const successCount = reportData.filter(r => r.status === 'success').length;
    const failCount = reportData.filter(r => r.status === 'failed').length;
    const totalTime = reportData.reduce((sum, r) => sum + r.export_time_ms, 0);
    const citiesWithCensus = reportData.filter(r => Object.keys(r.census_data || {}).length > 0).length;
    
    const summary = [
        '',
        '# Export Summary',
        `# Export Date: ${startTime.toISOString()}`,
        `# Total Cities: ${reportData.length}`,
        `# Successful: ${successCount}`,
        `# Failed: ${failCount}`,
        `# Cities with Census Data: ${citiesWithCensus}`,
        `# Total Export Time: ${Math.round(totalTime / 1000)}s`,
        `# Data Layers: ${activeLayers.join(', ') || 'None'}`,
        `# Census Variables: ${censusVars.join(', ') || 'None'}`
    ];
    
    return [allHeaders.join(','), ...rows, ...summary].join('\n');
}

// Wait for map tiles to finish loading
function waitForTilesToLoad() {
    return new Promise((resolve) => {
        // Track loading tiles
        let tilesLoading = 0;
        let resolved = false;
        
        const checkAndResolve = () => {
            if (resolved) return;
            if (tilesLoading <= 0) {
                resolved = true;
                // Additional delay after tiles loaded for rendering
                setTimeout(resolve, 500);
            }
        };
        
        // Set up tile loading tracking on the tile layer
        if (state.tileLayer) {
            state.tileLayer.on('loading', () => {
                tilesLoading++;
            });
            
            state.tileLayer.on('load', () => {
                tilesLoading = 0;
                checkAndResolve();
            });
            
            state.tileLayer.on('tileload', () => {
                // Individual tile loaded
            });
            
            state.tileLayer.on('tileerror', () => {
                tilesLoading--;
                checkAndResolve();
            });
        }
        
        // Timeout fallback - max 8 seconds wait
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                console.warn('Tile loading timeout - proceeding anyway');
                resolve();
            }
        }, 8000);
        
        // Check initial state after short delay
        setTimeout(() => {
            if (!resolved && tilesLoading <= 0) {
                resolved = true;
                clearTimeout(timeout);
                resolve();
            }
        }, 1000);
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
    const hideCenterMarker = document.getElementById('hideCenterMarkerOnExport').checked;
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
    
    // Store marker visibility state to restore later
    const markersWereVisible = state.map.hasLayer(state.layers.markers);
    
    if (hideControls) {
        if (zoomControl) zoomControl.style.display = 'none';
        if (scaleControl) scaleControl.style.display = 'none';
        if (mapOverlay) mapOverlay.style.display = 'none';
    }
    
    if (hideAttribution && attribution) {
        attribution.style.display = 'none';
    }
    
    // Hide center marker (the actual map marker, not just the indicator)
    if (hideCenterMarker) {
        if (cityIndicator) cityIndicator.style.display = 'none';
        if (markersWereVisible) state.map.removeLayer(state.layers.markers);
    }
    
    // Force a map redraw to ensure Canvas layers are rendered
    state.map.invalidateSize();
    
    // Wait for rendering to complete
    await delay(parseInt(document.getElementById('tileLoadWait').value));
    
    // Capture the map - with preferCanvas:true, boundaries render as Canvas which html2canvas handles well
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
    
    // Restore center marker
    if (hideCenterMarker) {
        if (cityIndicator && state.activeCityId) cityIndicator.style.display = 'block';
        if (markersWereVisible) state.layers.markers.addTo(state.map);
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

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * Works with GeoJSON geometry (supports Polygon and MultiPolygon)
 * Handles both raw geometry and Feature/FeatureCollection wrappers
 */
function isPointInPolygon(lat, lon, geojson) {
    if (!geojson) return true; // If no boundary, allow all points
    
    // Extract geometry from various GeoJSON formats
    let geometry = geojson;
    
    // Handle FeatureCollection
    if (geojson.type === 'FeatureCollection' && geojson.features?.length > 0) {
        geometry = geojson.features[0].geometry;
    }
    // Handle Feature
    else if (geojson.type === 'Feature' && geojson.geometry) {
        geometry = geojson.geometry;
    }
    // Handle if geojson has a geometry property (legacy)
    else if (geojson.geometry) {
        geometry = geojson.geometry;
    }
    // Otherwise assume it's raw geometry (Polygon, MultiPolygon, etc.)
    
    if (!geometry || !geometry.type) return true;
    
    const point = [lon, lat]; // GeoJSON uses [lon, lat]
    
    if (geometry.type === 'Polygon') {
        return isPointInRing(point, geometry.coordinates[0]);
    } else if (geometry.type === 'MultiPolygon') {
        // Check if point is in any of the polygons
        for (const polygon of geometry.coordinates) {
            if (isPointInRing(point, polygon[0])) {
                return true;
            }
        }
        return false;
    }
    
    return true; // For other geometry types, allow the point
}

/**
 * Ray casting algorithm to check if point is inside a ring (polygon boundary)
 */
function isPointInRing(point, ring) {
    const x = point[0], y = point[1];
    let inside = false;
    
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    
    return inside;
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
    
    // Clip to boundary checkbox
    const clipToBoundary = document.getElementById('clipToBoundary');
    if (clipToBoundary) {
        clipToBoundary.addEventListener('change', (e) => {
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
    const clipToBoundary = document.getElementById('clipToBoundary')?.checked ?? true;
    
    // Get the active city's GeoJSON for clipping
    let activeGeojson = null;
    if (clipToBoundary && state.activeCityId) {
        const activeCity = state.cities.find(c => c.id === state.activeCityId);
        if (activeCity?.geojson) {
            activeGeojson = activeCity.geojson;
        }
    }
    
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
        
        // Skip if clipping is enabled and point is outside boundary
        if (clipToBoundary && activeGeojson && !isPointInPolygon(lat, lon, activeGeojson)) {
            return;
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

// ============================================
// Census Data Functions
// ============================================

// Track selected Census variables
state.selectedCensusVars = new Set(['total_population', 'median_household_income', 'poverty_rate', 'unemployment_rate', 'median_home_value']);

function setupCensusListeners() {
    console.log('[Census] Setting up Census listeners...');
    
    // Preview Census data button
    const previewCensusBtn = document.getElementById('previewCensusBtn');
    console.log('[Census] Preview button found:', !!previewCensusBtn);
    if (previewCensusBtn) {
        previewCensusBtn.addEventListener('click', () => {
            console.log('[Census] Preview button clicked!');
            previewCensusData();
        });
    }
    
    // Clear Census cache button
    const clearCensusBtn = document.getElementById('clearCensusBtn');
    console.log('[Census] Clear button found:', !!clearCensusBtn);
    if (clearCensusBtn) {
        clearCensusBtn.addEventListener('click', () => {
            console.log('[Census] Clear button clicked!');
            clearCensusCache();
        });
    }
    
    // Census variable checkboxes
    const censusCheckboxes = document.querySelectorAll('input[data-census]');
    console.log('[Census] Found', censusCheckboxes.length, 'census checkboxes');
    
    censusCheckboxes.forEach(checkbox => {
        const varName = checkbox.dataset.census;
        // Set initial state based on default selections
        checkbox.checked = state.selectedCensusVars.has(varName);
        
        checkbox.addEventListener('change', (e) => {
            console.log('[Census] Checkbox changed:', varName, e.target.checked);
            if (e.target.checked) {
                state.selectedCensusVars.add(varName);
            } else {
                state.selectedCensusVars.delete(varName);
            }
            // Update overlay if visible
            if (document.getElementById('showCensusOverlay')?.checked) {
                updateCensusOverlay();
            }
        });
    });
    
    // Census overlay toggle
    const overlayToggle = document.getElementById('showCensusOverlay');
    if (overlayToggle) {
        overlayToggle.addEventListener('change', (e) => {
            console.log('[Census] Overlay toggle changed:', e.target.checked);
            if (e.target.checked) {
                updateCensusOverlay();
            } else {
                removeCensusOverlay();
            }
        });
    }
    
    console.log('[Census] Listeners setup complete');
}

async function previewCensusData() {
    console.log('[Census] previewCensusData called');
    console.log('[Census] Current city:', state.currentCity);
    
    if (!state.currentCity) {
        showToast('Please select a city first', 'error');
        return;
    }
    
    const loadingIndicator = document.getElementById('censusLoadingIndicator');
    const resultsContainer = document.getElementById('censusResults');
    
    console.log('[Census] Loading indicator:', !!loadingIndicator);
    console.log('[Census] Results container:', !!resultsContainer);
    
    if (loadingIndicator) loadingIndicator.style.display = 'flex';
    if (resultsContainer) resultsContainer.innerHTML = '<p class="muted small">Fetching data...</p>';
    
    try {
        console.log('[Census] Fetching data for city:', state.currentCity.name);
        const censusData = await fetchCensusDataForCity(state.currentCity);
        console.log('[Census] Received data:', censusData);
        
        if (censusData) {
            displayCensusPreview(censusData);
            showToast('Census data loaded', 'success');
            
            // Update overlay if enabled
            if (document.getElementById('showCensusOverlay')?.checked) {
                updateCensusOverlay();
            }
        } else {
            resultsContainer.innerHTML = '<p class="muted small">No Census data available for this city. Make sure it\'s a US city.</p>';
        }
        
    } catch (error) {
        console.error('[Census] Fetch error:', error);
        resultsContainer.innerHTML = '<p class="muted small">Failed to fetch Census data: ' + error.message + '</p>';
        showToast('Census fetch failed', 'error');
    }
    
    if (loadingIndicator) loadingIndicator.style.display = 'none';
}

async function fetchCensusDataForCity(city) {
    // Check cache first
    if (state.censusData[city.id]) {
        console.log('[Census] Using cached data for:', city.name);
        return state.censusData[city.id];
    }
    
    // Get the city name and state for Census lookup
    const cityName = city.name;
    const address = city.displayName || '';
    
    console.log('[Census] Looking up:', cityName, '| Address:', address);
    
    // Try to extract state from the display name
    const stateAbbr = extractStateFromAddress(address);
    
    if (!stateAbbr) {
        console.log('[Census] Could not determine state for:', cityName);
        return null;
    }
    
    console.log('[Census] State:', stateAbbr);
    
    // Get state FIPS code
    const stateFips = stateAbbrToFips(stateAbbr);
    if (!stateFips) {
        console.log('[Census] Unknown state FIPS:', stateAbbr);
        return null;
    }
    
    console.log('[Census] State FIPS:', stateFips);
    
    try {
        // First, find the place FIPS code
        console.log('[Census] Looking up place FIPS...');
        const placeData = await lookupCensusPlace(cityName, stateFips);
        
        if (!placeData) {
            console.log('[Census] Place not found:', cityName, stateAbbr);
            return null;
        }
        
        console.log('[Census] Place found:', placeData);
        
        // Fetch Census variables for this place
        console.log('[Census] Fetching variables...');
        const rawData = await fetchCensusVariables(placeData.state, placeData.place);
        
        if (!rawData) {
            console.log('[Census] No raw data returned');
            return null;
        }
        
        console.log('[Census] Raw data received:', rawData);
        
        // Process and cache the data
        const processedData = processCensusData(rawData);
        processedData.placeName = placeData.name;
        processedData.stateFips = placeData.state;
        processedData.placeFips = placeData.place;
        processedData.stateAbbr = stateAbbr;
        
        state.censusData[city.id] = processedData;
        
        console.log('[Census] Processed data:', processedData);
        
        return processedData;
        
    } catch (error) {
        console.error('[Census] Fetch error for', cityName, error);
        return null;
    }
}

function extractStateFromAddress(address) {
    // Check for state abbreviation (2 letters after comma)
    const abbrMatch = address.match(/,\s*([A-Z]{2})(?:\s|,|$)/);
    if (abbrMatch) {
        return abbrMatch[1];
    }
    
    // Common US state names
    const stateMap = {
        'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
        'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
        'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
        'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
        'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
        'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
        'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
        'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
        'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
        'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
        'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
        'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
        'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC'
    };
    
    const lowerAddress = address.toLowerCase();
    for (const [stateName, abbr] of Object.entries(stateMap)) {
        if (lowerAddress.includes(stateName)) {
            return abbr;
        }
    }
    
    return null;
}

async function lookupCensusPlace(cityName, stateFips) {
    try {
        // Use 2021 ACS 5-year estimates (most stable)
        const url = `https://api.census.gov/data/2021/acs/acs5?get=NAME&for=place:*&in=state:${stateFips}`;
        console.log('[Census] Place lookup URL:', url);
        
        const response = await fetch(url);
        console.log('[Census] Place lookup response status:', response.status);
        
        if (!response.ok) {
            console.error('[Census] Place lookup failed:', response.status);
            return null;
        }
        
        const data = await response.json();
        console.log('[Census] Found', data.length - 1, 'places in state');
        
        // Find matching city (case-insensitive)
        const searchName = cityName.toLowerCase().trim();
        
        for (let i = 1; i < data.length; i++) {
            const placeName = data[i][0].toLowerCase();
            // Match city name with various suffixes
            if (placeName.startsWith(searchName + ' ') || 
                placeName === searchName ||
                placeName.startsWith(searchName + ',')) {
                console.log('[Census] Exact match found:', data[i][0]);
                return {
                    name: data[i][0],
                    state: data[i][1],
                    place: data[i][2]
                };
            }
        }
        
        // Try partial match if exact match not found
        for (let i = 1; i < data.length; i++) {
            const placeName = data[i][0].toLowerCase();
            if (placeName.includes(searchName)) {
                console.log('[Census] Partial match found:', data[i][0]);
                return {
                    name: data[i][0],
                    state: data[i][1],
                    place: data[i][2]
                };
            }
        }
        
        console.log('[Census] No match found for:', searchName);
        return null;
    } catch (error) {
        console.error('[Census] Place lookup error:', error);
        return null;
    }
}

function stateAbbrToFips(abbr) {
    const fipsMap = {
        'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06',
        'CO': '08', 'CT': '09', 'DE': '10', 'DC': '11', 'FL': '12',
        'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18',
        'IA': '19', 'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23',
        'MD': '24', 'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28',
        'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33',
        'NJ': '34', 'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38',
        'OH': '39', 'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44',
        'SC': '45', 'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49',
        'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55',
        'WY': '56'
    };
    return fipsMap[abbr?.toUpperCase()] || null;
}

async function fetchCensusVariables(stateFips, placeFips) {
    // Build list of all variables we might need
    const variableList = [];
    
    for (const [key, def] of Object.entries(censusVariables)) {
        if (def.variables) {
            variableList.push(...def.variables);
        } else if (def.variable) {
            variableList.push(def.variable);
        }
    }
    
    const uniqueVars = [...new Set(variableList)];
    
    try {
        // Use 2021 ACS 5-year estimates
        const url = `https://api.census.gov/data/2021/acs/acs5?get=${uniqueVars.join(',')}&for=place:${placeFips}&in=state:${stateFips}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            console.error('Census data fetch failed:', response.status);
            return null;
        }
        
        const data = await response.json();
        
        if (data.length < 2) {
            return null;
        }
        
        // Parse response into object
        const headers = data[0];
        const values = data[1];
        const result = {};
        
        for (let i = 0; i < headers.length; i++) {
            const value = values[i];
            result[headers[i]] = value === null || value === '-' || value === '' ? null : parseFloat(value);
        }
        
        return result;
        
    } catch (error) {
        console.error('Census variables fetch error:', error);
        return null;
    }
}

function processCensusData(rawData) {
    const processed = { raw: rawData };
    
    for (const [key, def] of Object.entries(censusVariables)) {
        let value;
        
        if (def.calculated && def.variables) {
            const numerator = rawData[def.variables[0]];
            const denominator = rawData[def.variables[1]];
            value = (denominator && denominator > 0) ? (numerator / denominator) * 100 : null;
        } else {
            value = rawData[def.variable];
        }
        
        processed[key] = {
            value: value,
            formatted: formatCensusValue(value, def.format, def.unit),
            name: def.name,
            icon: def.icon,
            format: def.format
        };
    }
    
    return processed;
}

function displayCensusPreview(data) {
    const container = document.getElementById('censusResults');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Show only selected variables
    const selectedVars = Array.from(state.selectedCensusVars);
    
    if (selectedVars.length === 0) {
        container.innerHTML = '<p class="muted small">No variables selected.</p>';
        return;
    }
    
    const grid = document.createElement('div');
    grid.className = 'census-grid';
    
    for (const varName of selectedVars) {
        const varData = data[varName];
        if (!varData || varData.value === null) continue;
        
        const itemEl = document.createElement('div');
        itemEl.className = 'census-item';
        itemEl.innerHTML = `
            <span class="census-icon">${varData.icon}</span>
            <span class="census-label">${varData.name}</span>
            <span class="census-value">${varData.formatted}</span>
        `;
        grid.appendChild(itemEl);
    }
    
    if (grid.children.length === 0) {
        container.innerHTML = '<p class="muted small">No data available for selected variables.</p>';
    } else {
        container.appendChild(grid);
    }
}

function formatCensusValue(value, format, unit) {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    
    switch (format) {
        case 'currency':
            return '$' + Math.round(value).toLocaleString();
        case 'percent':
            return value.toFixed(1) + '%';
        case 'decimal':
            return value.toFixed(1) + (unit ? ' ' + unit : '');
        case 'density':
            return value.toFixed(0) + (unit ? ' ' + unit : '');
        case 'number':
        default:
            return Math.round(value).toLocaleString();
    }
}

function updateCensusOverlay() {
    removeCensusOverlay();
    
    if (!state.currentCity) return;
    
    const data = state.censusData[state.currentCity.id];
    if (!data) {
        // Try to fetch data if not cached
        previewCensusData();
        return;
    }
    
    const mapWrapper = document.getElementById('mapWrapper');
    if (!mapWrapper) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'censusOverlay';
    overlay.className = 'census-overlay';
    
    const title = document.createElement('div');
    title.className = 'census-overlay-title';
    title.textContent = '📊 Census Data';
    overlay.appendChild(title);
    
    const selectedVars = Array.from(state.selectedCensusVars);
    
    for (const varName of selectedVars) {
        const varData = data[varName];
        if (!varData || varData.value === null) continue;
        
        const item = document.createElement('div');
        item.className = 'census-overlay-item';
        item.innerHTML = `
            <span class="census-overlay-label">${varData.name}</span>
            <span class="census-overlay-value">${varData.formatted}</span>
        `;
        overlay.appendChild(item);
    }
    
    mapWrapper.appendChild(overlay);
}

function removeCensusOverlay() {
    const existing = document.getElementById('censusOverlay');
    if (existing) {
        existing.remove();
    }
}

function clearCensusCache() {
    state.censusData = {};
    removeCensusOverlay();
    
    const container = document.getElementById('censusResults');
    if (container) {
        container.innerHTML = '';
    }
    
    showToast('Census cache cleared', 'success');
}

// Get selected Census variables for export
function getSelectedCensusVariables() {
    return Array.from(state.selectedCensusVars);
}

// Format Census data for CSV export
function getCensusDataForExportRow(cityId) {
    const data = state.censusData[cityId];
    if (!data) return {};
    
    const row = {};
    for (const varName of state.selectedCensusVars) {
        const varData = data[varName];
        if (varData) {
            // Use raw value for CSV, not formatted
            row[`census_${varName}`] = varData.value;
        }
    }
    return row;
}

// ============================================
// Census Choropleth Map Functions
// ============================================

// Color schemes for choropleth
const colorSchemes = {
    blues: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#084594'],
    greens: ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#005a32'],
    reds: ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#99000d'],
    purples: ['#fcfbfd', '#efedf5', '#dadaeb', '#bcbddc', '#9e9ac8', '#807dba', '#6a51a3', '#4a1486'],
    oranges: ['#fff5eb', '#fee6ce', '#fdd0a2', '#fdae6b', '#fd8d3c', '#f16913', '#d94801', '#8c2d04'],
    viridis: ['#440154', '#482878', '#3e4a89', '#31688e', '#26838f', '#1f9e89', '#6cce5a', '#b6de2b'],
    rdylgn: ['#d73027', '#f46d43', '#fdae61', '#fee08b', '#d9ef8b', '#a6d96a', '#66bd63', '#1a9850']
};

// Census variable definitions for choropleth
const choroplethVariables = {
    median_household_income: {
        acsVariable: 'B19013_001E',
        name: 'Median Household Income',
        format: 'currency'
    },
    poverty_rate: {
        acsVariables: ['B17001_002E', 'B17001_001E'], // Below poverty / Total
        name: 'Poverty Rate',
        format: 'percent',
        calculate: (data) => data['B17001_001E'] > 0 ? (data['B17001_002E'] / data['B17001_001E']) * 100 : null
    },
    total_population: {
        acsVariable: 'B01003_001E',
        name: 'Total Population',
        format: 'number'
    },
    median_home_value: {
        acsVariable: 'B25077_001E',
        name: 'Median Home Value',
        format: 'currency'
    },
    median_rent: {
        acsVariable: 'B25064_001E',
        name: 'Median Rent',
        format: 'currency'
    },
    unemployment_rate: {
        acsVariables: ['B23025_005E', 'B23025_003E'], // Unemployed / In labor force
        name: 'Unemployment Rate',
        format: 'percent',
        calculate: (data) => data['B23025_003E'] > 0 ? (data['B23025_005E'] / data['B23025_003E']) * 100 : null
    },
    bachelors_degree: {
        acsVariables: ['B15003_022E', 'B15003_023E', 'B15003_024E', 'B15003_025E', 'B15003_001E'],
        name: "Bachelor's Degree or Higher",
        format: 'percent',
        calculate: (data) => {
            const total = data['B15003_001E'];
            if (!total || total === 0) return null;
            const bachelors = (data['B15003_022E'] || 0) + (data['B15003_023E'] || 0) + 
                            (data['B15003_024E'] || 0) + (data['B15003_025E'] || 0);
            return (bachelors / total) * 100;
        }
    }
};

// State for choropleth
state.choroplethLayer = null;
state.choroplethData = {};

function setupChoroplethListeners() {
    const loadBtn = document.getElementById('loadCensusChoropleth');
    const clearBtn = document.getElementById('clearCensusChoropleth');
    const opacitySlider = document.getElementById('censusLayerOpacity');
    
    if (loadBtn) {
        loadBtn.addEventListener('click', loadCensusChoropleth);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearCensusChoropleth);
    }
    
    if (opacitySlider) {
        opacitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            document.getElementById('censusLayerOpacityValue').textContent = Math.round(value * 100) + '%';
            updateChoroplethOpacity(value);
        });
    }
    
    // Update choropleth when color scheme changes
    document.getElementById('censusColorScheme')?.addEventListener('change', () => {
        if (state.choroplethLayer) {
            updateChoroplethColors();
        }
    });
    
    // Update choropleth when variable changes
    document.getElementById('censusMapVariable')?.addEventListener('change', () => {
        if (state.choroplethLayer) {
            loadCensusChoropleth();
        }
    });
}

async function loadCensusChoropleth() {
    const geoLevel = document.getElementById('censusGeoLevel').value;
    
    if (geoLevel === 'none') {
        clearCensusChoropleth();
        return;
    }
    
    if (!state.currentCity) {
        showToast('Please select a city first', 'error');
        return;
    }
    
    const loadingIndicator = document.getElementById('censusLoadingChoropleth');
    if (loadingIndicator) loadingIndicator.style.display = 'flex';
    
    try {
        // Get state FIPS from city
        const address = state.currentCity.displayName || '';
        const stateAbbr = extractStateFromAddress(address);
        
        if (!stateAbbr) {
            showToast('Could not determine state for this city', 'error');
            return;
        }
        
        const stateFips = stateAbbrToFips(stateAbbr);
        if (!stateFips) {
            showToast('Unknown state', 'error');
            return;
        }
        
        // Get city bounds
        const bounds = state.map.getBounds();
        
        console.log('[Choropleth] Loading', geoLevel, 'for state', stateAbbr, stateFips);
        
        // Fetch geographic boundaries
        const geoData = await fetchCensusGeography(geoLevel, stateFips, bounds);
        
        if (!geoData || !geoData.features || geoData.features.length === 0) {
            showToast('No census areas found in this region', 'warning');
            return;
        }
        
        console.log('[Choropleth] Found', geoData.features.length, 'geographic areas');
        
        // Fetch census data for these areas
        let variable = document.getElementById('censusMapVariable').value;
        
        // Census blocks only have Decennial population data
        if (geoLevel === 'block') {
            variable = 'total_population';
            showToast('Census blocks only support population data (2020 Decennial)', 'info');
        }
        
        const censusData = await fetchChoroplethData(geoLevel, stateFips, geoData.features, variable);
        
        console.log('[Choropleth] Census data loaded for', Object.keys(censusData).length, 'areas');
        
        // Create choropleth layer
        createChoroplethLayer(geoData, censusData, variable, geoLevel);
        
        showToast(`Loaded ${geoData.features.length} census areas`, 'success');
        
    } catch (error) {
        console.error('[Choropleth] Error:', error);
        showToast('Failed to load census map: ' + error.message, 'error');
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

async function fetchCensusGeography(geoLevel, stateFips, bounds) {
    // TIGERweb layer IDs:
    // Census Tracts: ACS2021 layer 6
    // Block Groups: ACS2021 layer 8
    // Census Blocks: Census2020 layer 10
    // ZCTAs: ACS2021 layer 0
    
    let url;
    const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
    
    if (geoLevel === 'tract') {
        // Layer 6 = Census Tracts
        url = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2021/MapServer/6/query?` +
              `where=STATE='${stateFips}'&geometry=${bbox}&geometryType=esriGeometryEnvelope&` +
              `inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=GEOID,NAME,BASENAME,STATE,COUNTY,TRACT&` +
              `returnGeometry=true&outSR=4326&f=geojson`;
    } else if (geoLevel === 'block-group') {
        // Layer 8 = Census Block Groups
        url = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2021/MapServer/8/query?` +
              `where=STATE='${stateFips}'&geometry=${bbox}&geometryType=esriGeometryEnvelope&` +
              `inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=GEOID,NAME,BASENAME,STATE,COUNTY,TRACT,BLKGRP&` +
              `returnGeometry=true&outSR=4326&f=geojson`;
    } else if (geoLevel === 'block') {
        // Layer 10 on Census2020 service = Census Blocks
        url = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer/10/query?` +
              `where=STATE='${stateFips}'&geometry=${bbox}&geometryType=esriGeometryEnvelope&` +
              `inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=GEOID,NAME,BASENAME,STATE,COUNTY,TRACT,BLOCK&` +
              `returnGeometry=true&outSR=4326&f=geojson`;
    } else if (geoLevel === 'zcta') {
        // Layer 0 = 2020 Census ZIP Code Tabulation Areas
        url = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2021/MapServer/0/query?` +
              `where=1=1&geometry=${bbox}&geometryType=esriGeometryEnvelope&` +
              `inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=GEOID,ZCTA5,BASENAME,NAME&` +
              `returnGeometry=true&outSR=4326&f=geojson`;
    }
    
    console.log('[Choropleth] Fetching geography:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Geography fetch failed: ${response.status}`);
    }
    
    return await response.json();
}

async function fetchChoroplethData(geoLevel, stateFips, features, variable) {
    const varDef = choroplethVariables[variable];
    if (!varDef) return {};
    
    // Build list of variables to fetch
    let varsToFetch = [];
    if (varDef.acsVariable) {
        varsToFetch.push(varDef.acsVariable);
    }
    if (varDef.acsVariables) {
        varsToFetch = varsToFetch.concat(varDef.acsVariables);
    }
    
    const varsParam = varsToFetch.join(',');
    
    // Build the Census API query based on geography level
    let url;
    
    // Census Blocks use Decennial 2020 (only population), others use ACS 5-Year
    const isBlock = geoLevel === 'block';
    
    if (geoLevel === 'tract') {
        url = `https://api.census.gov/data/2021/acs/acs5?get=${varsParam}&for=tract:*&in=state:${stateFips}`;
        
    } else if (geoLevel === 'block-group') {
        // Block groups require county in the hierarchy — fetch per county
        const counties = [...new Set(features.map(f => f.properties.COUNTY).filter(Boolean))];
        console.log('[Choropleth] Fetching block groups for', counties.length, 'counties:', counties);
        
        const allData = [];
        let headers = null;
        for (const county of counties) {
            const countyUrl = `https://api.census.gov/data/2021/acs/acs5?get=${varsParam}&for=block%20group:*&in=state:${stateFips}&in=county:${county}&in=tract:*`;
            console.log('[Choropleth] Fetching block groups for county', county);
            const resp = await fetch(countyUrl);
            if (!resp.ok) {
                console.warn('[Choropleth] Failed for county', county, resp.status);
                continue;
            }
            const countyData = await resp.json();
            if (!headers) {
                headers = countyData[0];
                allData.push(headers);
            }
            // Append rows (skip header)
            for (let i = 1; i < countyData.length; i++) {
                allData.push(countyData[i]);
            }
        }
        console.log('[Choropleth] Total block group records:', allData.length - 1);
        // Parse directly and return
        return parseCensusResponse(allData, geoLevel, features, variable);
        
    } else if (geoLevel === 'block') {
        // Census blocks use Decennial 2020 PL data — only population is available
        const counties = [...new Set(features.map(f => f.properties.COUNTY).filter(Boolean))];
        console.log('[Choropleth] Fetching blocks for', counties.length, 'counties');
        
        const allData = [];
        let headers = null;
        for (const county of counties) {
            const blockUrl = `https://api.census.gov/data/2020/dec/pl?get=P1_001N&for=block:*&in=state:${stateFips}&in=county:${county}&in=tract:*`;
            const resp = await fetch(blockUrl);
            if (!resp.ok) {
                console.warn('[Choropleth] Failed for county', county, resp.status);
                continue;
            }
            const blockData = await resp.json();
            if (!headers) {
                headers = blockData[0];
                allData.push(headers);
            }
            for (let i = 1; i < blockData.length; i++) {
                allData.push(blockData[i]);
            }
        }
        console.log('[Choropleth] Total block records:', allData.length - 1);
        return parseCensusResponse(allData, geoLevel, features, variable);
        
    } else if (geoLevel === 'zcta') {
        url = `https://api.census.gov/data/2021/acs/acs5?get=${varsParam}&for=zip%20code%20tabulation%20area:*`;
    }
    
    console.log('[Choropleth] Fetching census data:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Census data fetch failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Use shared parser
    return parseCensusResponse(data, geoLevel, features, variable);
}

function parseCensusResponse(data, geoLevel, features, variable) {
    if (!data || data.length < 2) return {};
    
    const varDef = choroplethVariables[variable];
    const result = {};
    const headers = data[0];
    
    console.log('[Choropleth] Census API headers:', headers);
    if (data.length > 1) {
        console.log('[Choropleth] Sample row:', data[1]);
    }
    
    if (features.length > 0) {
        console.log('[Choropleth] Sample geo GEOIDs:', features.slice(0, 3).map(f => f.properties.GEOID));
    }
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        let geoid;
        
        if (geoLevel === 'tract') {
            const stateIdx = headers.indexOf('state');
            const countyIdx = headers.indexOf('county');
            const tractIdx = headers.indexOf('tract');
            geoid = row[stateIdx] + row[countyIdx] + row[tractIdx];
        } else if (geoLevel === 'block-group') {
            const stateIdx = headers.indexOf('state');
            const countyIdx = headers.indexOf('county');
            const tractIdx = headers.indexOf('tract');
            const bgIdx = headers.indexOf('block group');
            geoid = row[stateIdx] + row[countyIdx] + row[tractIdx] + row[bgIdx];
        } else if (geoLevel === 'block') {
            const stateIdx = headers.indexOf('state');
            const countyIdx = headers.indexOf('county');
            const tractIdx = headers.indexOf('tract');
            const blkIdx = headers.indexOf('block');
            geoid = row[stateIdx] + row[countyIdx] + row[tractIdx] + row[blkIdx];
        } else if (geoLevel === 'zcta') {
            const zctaIdx = headers.indexOf('zip code tabulation area');
            geoid = row[zctaIdx];
        }
        
        // For Census blocks, data is just population (P1_001N)
        if (geoLevel === 'block') {
            const popIdx = headers.indexOf('P1_001N');
            if (popIdx >= 0) {
                const val = row[popIdx];
                const parsed = (val === null || val === '-' || val === '') ? null : parseFloat(val);
                if (parsed !== null && !isNaN(parsed)) {
                    result[geoid] = parsed;
                }
            }
            continue;
        }
        
        // Build list of variables to check
        let varsToCheck = [];
        if (varDef.acsVariable) varsToCheck.push(varDef.acsVariable);
        if (varDef.acsVariables) varsToCheck = varsToCheck.concat(varDef.acsVariables);
        
        // Parse values
        const values = {};
        for (const varName of varsToCheck) {
            const idx = headers.indexOf(varName);
            if (idx >= 0) {
                const val = row[idx];
                values[varName] = (val === null || val === '-' || val === '' || val === '-666666666') ? null : parseFloat(val);
            }
        }
        
        let finalValue;
        if (varDef.calculate) {
            finalValue = varDef.calculate(values);
        } else {
            finalValue = values[varDef.acsVariable];
        }
        
        if (finalValue !== null && !isNaN(finalValue) && finalValue >= -999999) {
            result[geoid] = finalValue;
        }
    }
    
    // Log match stats
    const geoIds = new Set(features.map(f => f.properties.GEOID));
    const matchedRaw = [...geoIds].filter(id => result[id] !== undefined).length;
    const matchedNorm = [...geoIds].filter(id => result[normalizeGeoId(id)] !== undefined).length;
    console.log('[Choropleth] Match stats: geo areas=' + geoIds.size + ', census records=' + Object.keys(result).length + ', raw matched=' + matchedRaw + ', normalized matched=' + matchedNorm);
    if (matchedRaw === 0 && matchedNorm === 0 && geoIds.size > 0 && Object.keys(result).length > 0) {
        const sampleGeo = [...geoIds].slice(0, 3);
        const sampleCensus = Object.keys(result).slice(0, 3);
        console.warn('[Choropleth] GEOID MISMATCH! Geo samples:', sampleGeo, 'Census samples:', sampleCensus);
    }
    
    return result;
}

function normalizeGeoId(geoid) {
    // TIGERweb GEOIDs may have prefixes like '1400000US' (tracts) or '1500000US' (block groups)
    // or '8600000US' (ZCTAs). Strip these to get the raw FIPS code.
    if (!geoid) return geoid;
    const match = geoid.match(/(?:\d{7}US)?(\d+)/);
    return match ? match[1] : geoid;
}

function createChoroplethLayer(geoData, censusData, variable, geoLevel) {
    // Clear existing layer
    clearCensusChoropleth();
    
    // For blocks, override varDef to show population
    let varDef;
    if (geoLevel === 'block') {
        varDef = { name: 'Population (2020 Census)', format: 'number' };
    } else {
        varDef = choroplethVariables[variable];
    }
    
    const colorScheme = document.getElementById('censusColorScheme').value;
    const colors = colorSchemes[colorScheme];
    const opacity = parseFloat(document.getElementById('censusLayerOpacity').value);
    const interactionMode = document.getElementById('censusInteractionMode')?.value || 'hover';
    
    // Normalize all geo feature GEOIDs
    geoData.features.forEach(f => {
        const raw = f.properties.GEOID;
        f.properties._normalizedGEOID = normalizeGeoId(raw);
    });
    
    // Debug logging
    const sampleGeoNorm = geoData.features.slice(0, 3).map(f => f.properties._normalizedGEOID);
    const sampleCensus = Object.keys(censusData).slice(0, 3);
    console.log('[Choropleth] Normalized GEOIDs:', sampleGeoNorm);
    console.log('[Choropleth] Census data GEOIDs:', sampleCensus);
    
    let matchCount = 0;
    geoData.features.forEach(f => {
        if (censusData[f.properties._normalizedGEOID] !== undefined) matchCount++;
    });
    console.log('[Choropleth] Matched features:', matchCount, '/', geoData.features.length);
    
    // Clip to city boundary
    let clippedGeoData = geoData;
    if (state.currentCity && state.currentCity.geojson) {
        try {
            const cityGeo = state.currentCity.geojson;
            const clippedFeatures = geoData.features.filter(feature => {
                const centroid = getFeatureCentroid(feature);
                if (!centroid) return false;
                return isPointInPolygon(centroid[1], centroid[0], cityGeo);
            });
            console.log('[Choropleth] Clipped to boundary:', clippedFeatures.length, '/', geoData.features.length, 'features kept');
            clippedGeoData = { type: 'FeatureCollection', features: clippedFeatures };
        } catch (e) {
            console.warn('[Choropleth] Clipping failed, using all features:', e);
        }
    }
    
    // Calculate min/max from matched data
    const matchedValues = [];
    clippedGeoData.features.forEach(f => {
        const val = censusData[f.properties._normalizedGEOID];
        if (val !== undefined && val !== null && !isNaN(val)) {
            matchedValues.push(val);
        }
    });
    
    if (matchedValues.length === 0) {
        showToast('No census data matched for these areas', 'warning');
        return;
    }
    
    const minVal = Math.min(...matchedValues);
    const maxVal = Math.max(...matchedValues);
    
    console.log('[Choropleth] Value range:', minVal, '-', maxVal, '(', matchedValues.length, 'areas with data)');
    
    // Store for legend, table, and map-table linking
    // Build a GEOID -> leaflet layer lookup for table click interaction
    const layersByGeoid = {};
    
    state.choroplethData = {
        min: minVal,
        max: maxVal,
        variable: variable,
        varDef: varDef,
        censusData: censusData,
        colorScheme: colorScheme,
        features: clippedGeoData.features,
        geoLevel: geoLevel
    };
    
    // Create the GeoJSON layer in the choroplethPane
    // Use SVG renderer explicitly — preferCanvas creates a Canvas per pane, and the
    // overlay pane's canvas (z-index 400) sits above choroplethPane (350) blocking
    // all mouse events. SVG elements render individually and handle events correctly.
    const choroplethRenderer = L.svg({ pane: 'choroplethPane' });
    state.choroplethLayer = L.geoJSON(clippedGeoData, {
        pane: 'choroplethPane',
        renderer: choroplethRenderer,
        style: (feature) => {
            const geoid = feature.properties._normalizedGEOID;
            const value = censusData[geoid];
            const color = getColorForValue(value, minVal, maxVal, colors);
            
            return {
                fillColor: color,
                fillOpacity: value !== undefined ? opacity : 0.05,
                color: '#555',
                weight: 0.8,
                opacity: 0.6
            };
        },
        onEachFeature: (feature, layer) => {
            const geoid = feature.properties._normalizedGEOID;
            const value = censusData[geoid];
            const name = feature.properties.NAME || feature.properties.BASENAME || 
                        feature.properties.ZCTA5 || geoid;
            
            // Store the original computed style so we can restore it explicitly
            // (resetStyle has quirks with custom SVG renderers)
            const origColor = getColorForValue(value, minVal, maxVal, colors);
            layer._origStyle = {
                fillColor: origColor,
                fillOpacity: value !== undefined ? opacity : 0.05,
                color: '#555',
                weight: 0.8,
                opacity: 0.6
            };
            
            // Store for table-to-map linking
            layersByGeoid[geoid] = layer;
            
            // Build content string
            const contentHtml = buildCensusTooltipContent(name, geoid, value, varDef);
            
            // Hover tooltip
            if (interactionMode === 'hover' || interactionMode === 'both') {
                layer.bindTooltip(contentHtml, {
                    sticky: true,
                    className: 'census-area-tooltip-wrapper'
                });
            }
            
            // Click popup
            if (interactionMode === 'click' || interactionMode === 'both') {
                layer.bindPopup(contentHtml, {
                    className: 'census-area-popup',
                    maxWidth: 280
                });
            }
            
            // Highlight on hover
            layer.on('mouseover', function() {
                this.setStyle({
                    weight: 2.5,
                    color: '#fff',
                    opacity: 1
                });
                // Also highlight corresponding table row
                highlightTableRow(geoid, true);
            });
            
            layer.on('mouseout', function() {
                // Don't reset if this is the currently-selected (clicked) area
                if (geoid !== state.choroplethData._selectedGeoid) {
                    this.setStyle(this._origStyle);
                }
                highlightTableRow(geoid, false);
            });
        }
    });
    
    // Store the layer lookup for table click interaction
    state.choroplethData.layersByGeoid = layersByGeoid;
    
    // Add to map
    state.choroplethLayer.addTo(state.map);
    
    // Show legend
    showChoroplethLegend(varDef, minVal, maxVal, colors);
    
    // Show data table with click-to-highlight support
    showChoroplethDataTable(clippedGeoData.features, censusData, varDef, geoLevel);
}

function buildCensusTooltipContent(name, geoid, value, varDef) {
    let html = `<div class="census-area-tooltip">`;
    html += `<div class="area-name">${name}</div>`;
    html += `<div class="area-geoid">GEOID: ${geoid}</div>`;
    if (value !== undefined) {
        html += `<div class="area-value">${varDef.name}: ${formatChoroplethValue(value, varDef.format)}</div>`;
    } else {
        html += `<div class="area-value">No data available</div>`;
    }
    html += `</div>`;
    return html;
}

function highlightTableRow(geoid, highlight) {
    const row = document.querySelector(`.census-data-table tr[data-geoid="${geoid}"]`);
    if (row) {
        if (highlight) {
            row.classList.add('highlighted');
            // Scroll into view if needed
            const scroll = row.closest('.table-scroll');
            if (scroll) {
                const rowTop = row.offsetTop - scroll.offsetTop;
                const scrollTop = scroll.scrollTop;
                const scrollHeight = scroll.clientHeight;
                if (rowTop < scrollTop || rowTop > scrollTop + scrollHeight - row.offsetHeight) {
                    row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            }
        } else {
            row.classList.remove('highlighted');
        }
    }
}

function highlightMapArea(geoid, highlight) {
    if (!state.choroplethData?.layersByGeoid) return;
    const layer = state.choroplethData.layersByGeoid[geoid];
    if (!layer) return;
    
    if (highlight) {
        layer.setStyle({
            weight: 3,
            color: '#ffff00',
            opacity: 1,
            fillOpacity: 0.85
        });
        layer.openTooltip();
    } else {
        // Don't reset if this is the currently-selected (clicked) area
        if (geoid !== state.choroplethData._selectedGeoid) {
            // Restore original data-colored style explicitly
            if (layer._origStyle) {
                layer.setStyle(layer._origStyle);
            }
        }
        layer.closeTooltip();
    }
}

function panToMapArea(geoid) {
    if (!state.choroplethData?.layersByGeoid) return;
    const layer = state.choroplethData.layersByGeoid[geoid];
    if (!layer) return;
    state.map.fitBounds(layer.getBounds(), { maxZoom: state.map.getZoom(), padding: [50, 50] });
}

function getFeatureCentroid(feature) {
    // Calculate rough centroid of a GeoJSON feature
    try {
        const coords = feature.geometry.coordinates;
        let points = [];
        
        if (feature.geometry.type === 'Polygon') {
            points = coords[0];
        } else if (feature.geometry.type === 'MultiPolygon') {
            points = coords[0][0];
        } else {
            return null;
        }
        
        let sumLat = 0, sumLng = 0;
        for (const p of points) {
            sumLng += p[0];
            sumLat += p[1];
        }
        return [sumLng / points.length, sumLat / points.length];
    } catch (e) {
        return null;
    }
}

function showChoroplethDataTable(features, censusData, varDef, geoLevel) {
    const container = document.getElementById('censusResults');
    if (!container) return;
    
    // Build data for table
    const rows = [];
    features.forEach(f => {
        const geoid = f.properties._normalizedGEOID;
        const value = censusData[geoid];
        const name = f.properties.NAME || f.properties.BASENAME || 
                    f.properties.ZCTA5 || geoid;
        rows.push({ name, geoid, value });
    });
    
    // Sort by value descending
    rows.sort((a, b) => {
        if (a.value === undefined) return 1;
        if (b.value === undefined) return -1;
        return b.value - a.value;
    });
    
    const withData = rows.filter(r => r.value !== undefined).length;
    
    // Determine data source attribution
    const geoLabels = { 'tract': 'Census Tracts', 'block-group': 'Block Groups', 'block': 'Census Blocks', 'zcta': 'ZCTAs' };
    const geoLabel = geoLabels[geoLevel] || geoLevel;
    let dataSource, geoSource;
    if (geoLevel === 'block') {
        dataSource = 'U.S. Census Bureau, 2020 Decennial Census (PL 94-171)';
        geoSource = 'U.S. Census Bureau TIGERweb, Census 2020';
    } else {
        dataSource = 'U.S. Census Bureau, American Community Survey 5-Year Estimates (2021)';
        geoSource = 'U.S. Census Bureau TIGERweb, ACS 2021';
    }
    const cityName = state.currentCity?.name || '';
    
    let html = `<div class="census-data-table">`;
    html += `<div class="table-header">📊 ${varDef.name} — ${withData} of ${rows.length} areas <span class="table-hint">Click row to locate on map</span></div>`;
    html += `<div class="table-scroll">`;
    html += `<table><thead><tr><th>#</th><th>Area</th><th>Value</th></tr></thead><tbody>`;
    
    rows.forEach((r, i) => {
        const formatted = r.value !== undefined ? formatChoroplethValue(r.value, varDef.format) : '—';
        const noDataCls = r.value === undefined ? ' no-data' : '';
        html += `<tr class="census-table-row${noDataCls}" data-geoid="${r.geoid}"><td class="row-num">${i + 1}</td><td title="GEOID: ${r.geoid}">${r.name}</td><td>${formatted}</td></tr>`;
    });
    
    html += `</tbody></table></div>`;
    
    // Attribution footer
    html += `<div class="table-attribution">`;
    html += `<div class="attribution-text">Data: ${dataSource}</div>`;
    html += `<div class="attribution-text">Geography: ${geoSource} (${geoLabel})</div>`;
    html += `</div>`;
    
    // Download button
    html += `<button class="btn-download-census" title="Download CSV with attribution">⬇ Download CSV</button>`;
    
    html += `</div>`;
    container.innerHTML = html;
    
    // Wire up download button
    container.querySelector('.btn-download-census')?.addEventListener('click', () => {
        downloadCensusCSV(rows, varDef, geoLevel, geoLabel, dataSource, geoSource, cityName);
    });
    
    // Add click and hover listeners to table rows
    container.querySelectorAll('.census-table-row').forEach(row => {
        const geoid = row.dataset.geoid;
        
        // Hover: highlight on map
        row.addEventListener('mouseenter', () => {
            highlightMapArea(geoid, true);
        });
        row.addEventListener('mouseleave', () => {
            highlightMapArea(geoid, false);
        });
        
        // Click: pan to area and open popup
        row.addEventListener('click', () => {
            // Reset previously-selected area's map style
            const prevGeoid = state.choroplethData?._selectedGeoid;
            if (prevGeoid && prevGeoid !== geoid) {
                const prevLayer = state.choroplethData?.layersByGeoid?.[prevGeoid];
                if (prevLayer) {
                    if (prevLayer._origStyle) {
                        prevLayer.setStyle(prevLayer._origStyle);
                    }
                    prevLayer.closePopup();
                }
            }
            
            // Remove previous selection class
            container.querySelectorAll('.census-table-row.selected').forEach(r => r.classList.remove('selected'));
            row.classList.add('selected');
            
            // Track selected geoid
            state.choroplethData._selectedGeoid = geoid;
            
            panToMapArea(geoid);
            highlightMapArea(geoid, true);
            
            // Open popup on the layer
            const layer = state.choroplethData?.layersByGeoid?.[geoid];
            if (layer) {
                const name = row.querySelector('td:nth-child(2)').textContent;
                const value = state.choroplethData.censusData[geoid];
                const popupHtml = buildCensusTooltipContent(name, geoid, value, state.choroplethData.varDef);
                layer.bindPopup(popupHtml, { className: 'census-area-popup', maxWidth: 280 }).openPopup();
            }
        });
    });
}

function downloadCensusCSV(rows, varDef, geoLevel, geoLabel, dataSource, geoSource, cityName) {
    // Build CSV content with attribution header
    const lines = [];
    
    // Attribution header rows (prefixed with # for comments)
    const timestamp = new Date().toISOString().split('T')[0];
    lines.push(`# Census Data Export — ${cityName || 'Unknown City'}`);
    lines.push(`# Variable: ${varDef.name}`);
    lines.push(`# Geography Level: ${geoLabel}`);
    lines.push(`# Data Source: ${dataSource}`);
    lines.push(`# Geographic Boundaries: ${geoSource}`);
    lines.push(`# Generated: ${timestamp}`);
    lines.push(`# Generated by: MapMaker (https://github.com)`);
    lines.push('#');
    
    // CSV header
    lines.push('Rank,Area,GEOID,Value');
    
    // Data rows
    rows.forEach((r, i) => {
        const formatted = r.value !== undefined ? r.value : '';
        // Escape area name if it contains commas or quotes
        let name = r.name;
        if (name.includes(',') || name.includes('"')) {
            name = '"' + name.replace(/"/g, '""') + '"';
        }
        lines.push(`${i + 1},${name},${r.geoid},${formatted}`);
    });
    
    // Attribution footer rows
    lines.push('#');
    lines.push(`# Source: ${dataSource}`);
    lines.push(`# Geography: ${geoSource}`);
    
    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Generate filename
    const safeCity = (cityName || 'export').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const safeVar = varDef.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const filename = `census_${safeCity}_${safeVar}_${geoLevel}_${timestamp}.csv`;
    
    // Trigger download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    showToast(`Downloaded ${filename}`, 'success');
}

function getColorForValue(value, min, max, colors) {
    if (value === undefined || value === null || isNaN(value)) {
        return '#ccc';
    }
    
    // Normalize value to 0-1 range
    const range = max - min;
    if (range === 0) return colors[Math.floor(colors.length / 2)];
    
    const normalized = (value - min) / range;
    const index = Math.min(Math.floor(normalized * colors.length), colors.length - 1);
    
    return colors[index];
}

function formatChoroplethValue(value, format) {
    if (value === null || value === undefined) return 'N/A';
    
    switch (format) {
        case 'currency':
            return '$' + Math.round(value).toLocaleString();
        case 'percent':
            return value.toFixed(1) + '%';
        case 'number':
            return Math.round(value).toLocaleString();
        default:
            return value.toString();
    }
}

function showChoroplethLegend(varDef, min, max, colors) {
    const legend = document.getElementById('choroplethLegend');
    const title = document.getElementById('legendTitle');
    const scale = document.getElementById('legendScale');
    const minLabel = document.getElementById('legendMin');
    const maxLabel = document.getElementById('legendMax');
    
    if (!legend) return;
    
    // Set title
    title.textContent = varDef.name;
    
    // Create gradient for scale
    const gradient = colors.join(', ');
    scale.style.background = `linear-gradient(to right, ${gradient})`;
    
    // Set labels
    minLabel.textContent = formatChoroplethValue(min, varDef.format);
    maxLabel.textContent = formatChoroplethValue(max, varDef.format);
    
    legend.style.display = 'block';
}

function hideChoroplethLegend() {
    const legend = document.getElementById('choroplethLegend');
    if (legend) {
        legend.style.display = 'none';
    }
}

function updateChoroplethOpacity(opacity) {
    if (state.choroplethLayer) {
        state.choroplethLayer.eachLayer(layer => {
            layer.setStyle({ fillOpacity: opacity });
            // Keep _origStyle in sync
            if (layer._origStyle) {
                layer._origStyle.fillOpacity = opacity;
            }
        });
    }
}

function updateChoroplethColors() {
    if (!state.choroplethLayer || !state.choroplethData.censusData) return;
    
    const colorScheme = document.getElementById('censusColorScheme').value;
    const colors = colorSchemes[colorScheme];
    const { min, max, censusData, varDef } = state.choroplethData;
    const opacity = parseFloat(document.getElementById('censusLayerOpacity').value);
    
    state.choroplethLayer.eachLayer(layer => {
        const feature = layer.feature;
        if (!feature) return;
        const geoid = feature.properties._normalizedGEOID || feature.properties.GEOID;
        const value = censusData[geoid];
        const color = getColorForValue(value, min, max, colors);
        
        const newStyle = {
            fillColor: color,
            fillOpacity: value !== undefined ? opacity : 0.05,
            color: '#555',
            weight: 0.8,
            opacity: 0.6
        };
        layer.setStyle(newStyle);
        // Keep _origStyle in sync so hover/unhover restores the new colors
        layer._origStyle = { ...newStyle };
    });
    
    // Update legend
    showChoroplethLegend(varDef, min, max, colors);
}

function clearCensusChoropleth() {
    if (state.choroplethLayer) {
        state.map.removeLayer(state.choroplethLayer);
        state.choroplethLayer = null;
    }
    state.choroplethData = {};
    hideChoroplethLegend();
    // Clear data table
    const container = document.getElementById('censusResults');
    if (container) container.innerHTML = '';
}
