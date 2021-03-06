var Class = require('../../utils/Class');
var MapData = require('./mapdata/MapData');
var LayerData = require('./mapdata/LayerData');
var StaticTilemapLayer = require('./staticlayer/StaticTilemapLayer.js');
var DynamicTilemapLayer = require('./dynamiclayer/DynamicTilemapLayer.js');
var Tileset = require('./Tileset');
var Formats = require('./Formats');
var TilemapComponents = require('./components');
var Tile = require('./Tile');

var Tilemap = new Class({

    initialize:

    function Tilemap (scene, mapData)
    {
        this.scene = scene;

        this.tilesets = [];
        this.tileWidth = mapData.tileWidth;
        this.tileHeight = mapData.tileHeight;

        this.width = mapData.width;
        this.height = mapData.height;
        this.orientation = mapData.orientation;
        this.format = mapData.format;
        this.version = mapData.version;
        this.properties = mapData.properties;
        this.widthInPixels = mapData.widthInPixels;
        this.heightInPixels = mapData.heightInPixels;
        this.layers = mapData.layers;
        this.tilesets = mapData.tilesets;
        this.tiles = mapData.tiles;
        this.objects = mapData.objects;
        this.currentLayerIndex = 0;

        // TODO: collision, collideIndexes, imagecollections, images
        // TODO: debugging methods
    },

    addTilesetImage: function (tilesetName, key, tileWidth, tileHeight, tileMargin, tileSpacing, gid)
    {
        if (tilesetName === undefined) { return null; }
        if (key === undefined || key === null) { key = tilesetName; }
        if (tileWidth === undefined) { tileWidth = this.tileWidth; }
        if (tileHeight === undefined) { tileHeight = this.tileHeight; }
        if (tileMargin === undefined) { tileMargin = 0; }
        if (tileSpacing === undefined) { tileSpacing = 0; }
        if (gid === undefined) { gid = 0; }

        //  In-case we're working from a blank map
        if (tileWidth === 0) { tileWidth = 32; }
        if (tileHeight === 0) { tileHeight = 32; }

        if (!this.scene.sys.textures.exists(key))
        {
            console.warn('Invalid image key given for tileset: "' + key + '"');
            return null;
        }

        var texture = this.scene.sys.textures.get(key);

        // TODO: potentially add in v2 support for bitmap data

        var index = this.getTilesetIndex(tilesetName);

        if (index === null && this.format === Formats.TILEMAP_TILED_JSON)
        {
            console.warn('No data found in the JSON tilemap from Tiled matching the tileset name: "' + tilesetName + '"');
            return null;
        }

        if (this.tilesets[index])
        {
            this.tilesets[index].setImage(texture);
            return this.tilesets[index];
        }
        else
        {
            var tileset = new Tileset(tilesetName, gid, tileWidth, tileHeight, tileMargin, tileSpacing, {});
            tileset.setImage(texture);

            this.tilesets.push(tileset);

            // TODO: add in GID & master list of tiles
        }

        return tileset;
    },

    // Creates & selects
    createBlankDynamicLayer: function (name, tileset, x, y, width, height, tileWidth, tileHeight)
    {
        if (tileWidth === undefined) { tileWidth = this.tileWidth; }
        if (tileHeight === undefined) { tileHeight = this.tileHeight; }
        if (width === undefined) { width = this.width; }
        if (height === undefined) { height = this.height; }
        if (x === undefined) { x = 0; }
        if (y === undefined) { y = 0; }

        var index = this.getLayerIndex(name);

        if (index !== null)
        {
            console.warn('Cannot create blank layer: layer with matching name already exists ' + name);
            return null;
        }

        var layerData = new LayerData({
            name: name,
            tileWidth: tileWidth,
            tileHeight: tileHeight,
            width: width,
            height: height
        });

        var row;
        for (var tileY = 0; tileY < height; tileY++)
        {
            row = [];
            for (var tileX = 0; tileX < width; tileX++)
            {
                row.push(new Tile(layerData, -1, tileX, tileY, tileWidth, tileHeight));
            }
            layerData.data.push(row);
        }

        this.layers.push(layerData);
        this.currentLayerIndex = this.layers.length - 1;

        // TODO: decide about v2 trimming to game width/height

        var dynamicLayer = new DynamicTilemapLayer(this.scene, this, this.currentLayerIndex, tileset, x, y);
        this.scene.sys.displayList.add(dynamicLayer);

        return dynamicLayer;
    },

    // Creates & selects
    createStaticLayer: function (layerID, tileset, x, y)
    {
        var index = this.getLayerIndex(layerID);

        if (index === null)
        {
            console.warn('Cannot create tilemap layer, invalid layer ID given: ' + layerID);
            return null;
        }

        // Check for an associated static or dynamic tilemap layer
        if (this.layers[index].tilemapLayer)
        {
            console.warn('Cannot create static tilemap layer since a static or dynamic tilemap layer exists for layer ID:' + layerID);
            return null;
        }

        // TODO: new feature, allow multiple CSV layers
        // TODO: display dimension

        this.currentLayerIndex = index;

        var layer = new StaticTilemapLayer(this.scene, this, index, tileset, x, y);
        this.scene.sys.displayList.add(layer);
        return layer;
    },

    // Creates & selects
    createDynamicLayer: function (layerID, tileset, x, y)
    {
        var index = this.getLayerIndex(layerID);

        if (index === null)
        {
            console.warn('Cannot create tilemap layer, invalid layer ID given: ' + layerID);
            return null;
        }

        // Check for an associated static or dynamic tilemap layer
        if (this.layers[index].tilemapLayer)
        {
            console.warn('Cannot create dynamic tilemap layer since a static or dynamic tilemap layer exists for layer ID:' + layerID);
            return null;
        }

        // TODO: new feature, allow multiple CSV layers
        // TODO: display dimension

        this.currentLayerIndex = index;

        var layer = new DynamicTilemapLayer(this.scene, this, index, tileset, x, y);
        this.scene.sys.displayList.add(layer);
        return layer;
    },

    copy: function (srcTileX, srcTileY, width, height, destTileX, destTileY, layer)
    {
        layer = this.getLayer(layer);
        if (this._isStaticCall(layer, 'copy')) { return this; }
        if (layer !== null)
        {
            TilemapComponents.Copy(srcTileX, srcTileY, width, height, destTileX, destTileY, layer);
        }
        return this;
    },

    destroy: function ()
    {
        this.layers.length = 0;
        this.tilesets.length = 0;
        this.tiles.length = 0;
        this.objects.length = 0;
        this.scene = undefined;
    },

    fill: function (index, tileX, tileY, width, height, layer)
    {
        layer = this.getLayer(layer);
        if (this._isStaticCall(layer, 'fill')) { return this; }
        if (layer !== null)
        {
            TilemapComponents.Fill(index, tileX, tileY, width, height, layer);
        }
        return this;
    },

    findByIndex: function (findIndex, skip, reverse, layer)
    {
        layer = this.getLayer(layer);
        if (layer === null) { return null; }
        return TilemapComponents.FindByIndex(findIndex, skip, reverse, layer);
    },

    forEachTile: function (callback, context, tileX, tileY, width, height, layer)
    {
        layer = this.getLayer(layer);
        if (layer !== null)
        {
            TilemapComponents.ForEachTile(callback, context, tileX, tileY, width, height, layer);
        }
        return this;
    },

    getIndex: function (location, name)
    {
        for (var i = 0; i < location.length; i++)
        {
            if (location[i].name === name)
            {
                return i;
            }
        }
        return null;
    },

    getLayer: function (layer)
    {
        var index = this.getLayerIndex(layer);
        return index !== null ? this.layers[index] : null;
    },

    getLayerIndex: function (layer)
    {
        if (layer === undefined)
        {
            return this.currentLayerIndex;
        }
        else if (typeof layer === 'string')
        {
            return this.getLayerIndexByName(layer);
        }
        else if (typeof layer === 'number' && layer < this.layers.length)
        {
            return layer;
        }
        else if (layer instanceof StaticTilemapLayer || layer instanceof DynamicTilemapLayer)
        {
            return layer.layerIndex;
        }
        else
        {
            return null;
        }
    },

    getLayerIndexByName: function (name)
    {
        return this.getIndex(this.layers, name);
    },

    getTileAt: function (tileX, tileY, nonNull, layer)
    {
        layer = this.getLayer(layer);
        if (layer === null) { return null; }
        return TilemapComponents.GetTileAt(tileX, tileY, nonNull, layer);
    },

    getTileAtWorldXY: function (worldX, worldY, nonNull, camera, layer)
    {
        layer = this.getLayer(layer);
        if (layer === null) { return null; }
        return TilemapComponents.GetTileAtWorldXY(worldX, worldY, nonNull, camera, layer);
    },

    getTilesWithin: function (tileX, tileY, width, height, layer)
    {
        layer = this.getLayer(layer);
        if (layer === null) { return null; }
        return TilemapComponents.GetTilesWithin(tileX, tileY, width, height, layer);
    },

    getTilesetIndex: function (name)
    {
        return this.getIndex(this.tilesets, name);
    },

    hasTileAt: function (tileX, tileY, layer)
    {
        layer = this.getLayer(layer);
        if (layer === null) { return null; }
        return TilemapComponents.HasTileAt(tileX, tileY, layer);
    },

    hasTileAtWorldXY: function (worldX, worldY, camera, layer)
    {
        layer = this.getLayer(layer);
        if (layer === null) { return null; }
        return TilemapComponents.HasTileAtWorldXY(worldX, worldY, camera, layer);
    },

    layer: {
        get: function ()
        {
            return this.layers[this.currentLayerIndex];
        },

        set: function (layer)
        {
            this.setLayer(layer);
        }
    },

    putTile: function (tile, tileX, tileY, layer)
    {
        layer = this.getLayer(layer);
        if (this._isStaticCall(layer, 'putTile')) { return null; }
        if (layer === null) { return null; }
        return TilemapComponents.PutTile(tile, tileX, tileY, layer);
    },

    putTileWorldXY: function (tile, worldX, worldY, camera, layer)
    {
        layer = this.getLayer(layer);
        if (this._isStaticCall(layer, 'putTileWorldXY')) { return null; }
        if (layer === null) { return null; }
        return TilemapComponents.PutTileWorldXY(tile, worldX, worldY, camera, layer);
    },

    randomize: function (tileX, tileY, width, height, indices, layer)
    {
        layer = this.getLayer(layer);
        if (this._isStaticCall(layer, 'randomize')) { return this; }
        if (layer !== null)
        {
            TilemapComponents.Randomize(tileX, tileY, width, height, indices, layer);
        }
        return this;
    },

    removeAllLayers: function ()
    {
        this.layers.length = 0;
        this.currentLayerIndex = 0;
        return this;
    },

    removeTile: function (tileX, tileY, replaceWithNull, layer)
    {
        layer = this.getLayer(layer);
        if (this._isStaticCall(layer, 'removeTile')) { return null; }
        if (layer === null) { return null; }
        return TilemapComponents.RemoveTile(tileX, tileY, replaceWithNull, layer);
    },

    removeTileWorldXY: function (worldX, worldY, replaceWithNull, camera, layer)
    {
        layer = this.getLayer(layer);
        if (this._isStaticCall(layer, 'removeTileWorldXY')) { return null; }
        if (layer === null) { return null; }
        return TilemapComponents.RemoveTileWorldXY(worldX, worldY, replaceWithNull, camera, layer);
    },

    replaceByIndex: function (findIndex, newIndex, tileX, tileY, width, height, layer)
    {
        layer = this.getLayer(layer);
        if (this._isStaticCall(layer, 'replaceByIndex')) { return this; }
        if (layer !== null)
        {
            TilemapComponents.ReplaceByIndex(findIndex, newIndex, tileX, tileY, width, height, layer);
        }
        return this;
    },

    setLayer: function (layer)
    {
        var index = this.getLayerIndex(layer);
        if (index !== null)
        {
            this.currentLayerIndex = index;
        }
        return this;
    },

    setTileSize: function (tileWidth, tileHeight)
    {
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
        this.widthInPixels = this.width * tileWidth;
        this.heightInPixels = this.height * tileHeight;
    },

    shuffle: function (tileX, tileY, width, height, layer)
    {
        layer = this.getLayer(layer);
        if (this._isStaticCall(layer, 'shuffle')) { return this; }
        if (layer !== null)
        {
            TilemapComponents.Shuffle(tileX, tileY, width, height, layer);
        }
        return this;
    },

    swapByIndex: function (indexA, indexB, tileX, tileY, width, height, layer)
    {
        layer = this.getLayer(layer);
        if (this._isStaticCall(layer, 'swapByIndex')) { return this; }
        if (layer !== null)
        {
            TilemapComponents.SwapByIndex(indexA, indexB, tileX, tileY, width, height, layer);
        }
        return this;
    },

    worldToTileX: function (worldX, camera, layer)
    {
        layer = this.getLayer(layer);
        if (layer === null) { return null; }
        return TilemapComponents.WorldToTileX(worldX, camera, layer);
    },

    worldToTileY: function (worldY, camera, layer)
    {
        layer = this.getLayer(layer);
        if (layer === null) { return null; }
        return TilemapComponents.WorldToTileY(worldY, camera, layer);
    },

    worldToTileXY: function (worldX, worldY, point, camera, layer)
    {
        layer = this.getLayer(layer);
        if (layer === null) { return null; }
        return TilemapComponents.WorldToTileXY(worldX, worldY, point, camera, layer);
    },

    _isStaticCall: function (layer, functionName)
    {
        if (layer.tilemapLayer instanceof StaticTilemapLayer)
        {
            console.warn(functionName + ': You cannot change the tiles in a static tilemap layer');
            return true;
        }
        else
        {
            return false;
        }
    }

});

module.exports = Tilemap;
