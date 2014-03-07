/*
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

(function () {
    "use strict";

    var util = require("util"),
        assert = require("assert"),
        events = require("events");

    var createLayer = require("./layer").createLayer;

    function Document(raw) {
        this._id = raw.id;
        this._count = raw.count;
        this._timeStamp = raw.timeStamp;
        this._version = raw.version;

        if (raw.hasOwnProperty("file")) {
            this._setFile(raw.file);
        }

        if (raw.hasOwnProperty("bounds")) {
            this._setBounds(raw.bounds);
        }

        if (raw.hasOwnProperty("selection")) {
            this._setSelection(raw.selection);
        }

        if (raw.hasOwnProperty("resolution")) {
            this._setResolution(raw.resolution);
        }

        if (raw.hasOwnProperty("globalLight")) {
            this._setResolution(raw.resolution);
        }

        if (raw.hasOwnProperty("generatorSettings")) {
            this._setGeneratorSettings(raw.generatorSettings);
        }

        if (raw.hasOwnProperty("layers")) {
            this._setLayers(raw);
        }

        if (raw.hasOwnProperty("comps")) {
            this._setComps(raw.comps);
        }

        if (raw.hasOwnProperty("placed")) {
            this._setPlaced(raw.placed);
        }
    }

    util.inherits(Document, events.EventEmitter);

    /**
     * @type {number}
     */
    Document.prototype._id = null;

    /**
     * @type {string}
     */
    Document.prototype._version = null;

    /**
     * @type {number}
     */
    Document.prototype._count = null;

    /**
     * @type {number}
     */
    Document.prototype._timeStamp = null;

    /**
     * @type {string}
     */
    Document.prototype._file = null;

    /**
     * @type {Bounds}
     */
    Document.prototype._bounds = null;

    /**
     * @type {Object.<number, boolean>}
     */
    Document.prototype._selection = null;

    /**
     * @type {number}
     */
    Document.prototype._resolution = null;

    /**
     * @type {{altitude: number, angle: number}}
     */
    Document.prototype._globalLight = null;

    Document.prototype._generatorSettings = null;

    /**
     * @type {LayerGroup}
     */
    Document.prototype._layers = null;

    /**
     * @type {Object.<number, Object>}
     */
    Document.prototype._placed = null;

    /**
     * @type {Object.<number, Object>}
     */
    Document.prototype._comps = null;

    Document.prototype._setFile = function (rawFile) {
        this._file = rawFile;
    };

    Document.prototype._updateFile = function (rawFile) {
        var previousFile = this._file;
        this._setFile(rawFile);

        return {
            previous: previousFile
        };
    };

    Document.prototype._setSelection = function (rawSelection) {
        this._selection = rawSelection.reduce(function (prev, curr) {
            prev[curr] = true;
            return prev;
        }.bind(this), {});
    };

    Document.prototype._updateSelection = function (rawSelection) {
        var previousSelection = this._selection;
        this._setSelection(rawSelection);

        return {
            previous: previousSelection
        };
    };

    Document.prototype._setBounds = function (rawBounds) {
        this._bounds = rawBounds;
    };

    Document.prototype._updateBounds = function (rawBounds) {
        var previousBounds = this._bounds;
        this._setBounds(rawBounds);

        return {
            previous: previousBounds
        };
    };

    Document.prototype._setResolution = function (rawResolution) {
        this._resolution = rawResolution;
    };

    Document.prototype._updateResolution = function (rawResolution) {
        var previousResolution = this._resolution;
        this._setResolution(rawResolution);

        return {
            previous: previousResolution
        };
    };

    Document.prototype._setGlobalLight = function (rawGlobalLight) {
        this._globalLight = rawGlobalLight;
    };

    Document.prototype._updateGlobalLight = function (rawGlobalLight) {
        var previousGlobalLight = this._globalLight;
        this._setGlobalLight(rawGlobalLight);

        return {
            previous: previousGlobalLight
        };
    };

    Document.prototype._setGeneratorSettings = function (rawGeneratorSettings) {
        this._generatorSettings = rawGeneratorSettings;
    };

    Document.prototype._updateGeneratorSettings = function (rawGeneratorSettings) {
        var previousGeneratorSettings = this._generatorSettings;
        this._setGeneratorSettings(rawGeneratorSettings);

        return {
            previous: previousGeneratorSettings
        };
    };

    Document.prototype._setClosed = function (closed) {
        this._closed = closed;
    };

    Document.prototype._setActive = function (active) {
        this._active = active;
    };

    Document.prototype._setMerged = function (merged) {
        this._merged = merged;
    };

    Document.prototype._setFlattened = function (flattened) {
        this._flattened = flattened;
    };

    Document.prototype._setLayers = function (raw) {
        this._layers = createLayer(null, raw);
        this._validateLayerChanges(raw.layers);
    };

    Document.prototype._getChangedLayers = function (rawLayerChanges, changed) {
        changed = changed || {};

        rawLayerChanges.forEach(function (rawLayerChange) {
            if (!rawLayerChange.hasOwnProperty("index") && !rawLayerChange.removed) {
                return;
            }

            if (rawLayerChange.hasOwnProperty("layers")) {
                this._getChangedLayers(rawLayerChange.layers, changed);
            }

            var id = rawLayerChange.id,
                result;

            if (rawLayerChange.added) {
                result = {
                    type: "added",
                    index: rawLayerChange.index
                };
            } else {
                result = this._layers.findLayer(id);

                if (!result) {
                    if (rawLayerChange.removed) {
                        // Phantom section/group end layer
                        return;
                    } else {
                        throw new Error("Can't find changed layer:", id);
                    }
                }

                if (rawLayerChange.removed) {
                    result.type = "removed";
                } else {
                    result.type = "moved";
                }
            }

            changed[id] = result;
        }, this);

        return changed;
    };

    Document.prototype._removeChangedLayers = function (changedLayers) {
        var layers = Object.keys(changedLayers).map(function (id) {
            return changedLayers[id];
        });

        layers.sort(function (l1, l2) {
            return l1.index - l2.index;
        });

        layers.forEach(function (layerRec) {
            if (layerRec.type === "added") {
                return;
            }

            // remove the layer from its current position
            layerRec.layer.detach();
        });
    };

    Document.prototype._validateLayerChanges = function (rawLayerChanges) {
        rawLayerChanges.forEach(function (rawLayerChange) {
            if (rawLayerChange.hasOwnProperty("index")) {
                var index = rawLayerChange.index,
                    id = rawLayerChange.id,
                    result = this._layers.findLayer(id);

                if (rawLayerChange.removed) {
                    assert(!result, "Removed layer " + id + " still exists at index " + result.index);
                } else {
                    var message = "Layer " + id + " has index " + result.index + " instead of " + index;
                    assert.strictEqual(index, result.index, message);
                }

                if (rawLayerChange.hasOwnProperty("layers")) {
                    this._validateLayerChanges(rawLayerChange.layers);
                }
            }
        }, this);
    };

    Document.prototype._updateLayers = function (rawLayerChanges) {
        // Find all the existing layers that need to be updated
        var changedLayers = this._getChangedLayers(rawLayerChanges);

        // Remove them from the tree
        this._removeChangedLayers(changedLayers);

        // Add or re-add new layers to the tree at their new indexes
        this._layers._applyChange(changedLayers, rawLayerChanges);

        this._validateLayerChanges(rawLayerChanges);

        // Sort the updates into added/removed/moved sets
        var addedLayers = {},
            removedLayers = {},
            movedLayers = {};

        Object.keys(changedLayers).forEach(function (id) {
            var rec = changedLayers[id];

            switch (rec.type) {
            case "added":
                addedLayers[rec.id] = rec.layer;
                break;
            case "removed":
                removedLayers[rec.id] = rec.layer;
                break;
            case "moved":
                movedLayers[rec.id] = rec.layer;
                break;
            default:
                throw new Error("Unknown layer change type:", rec.type);
            }
        });

        return {
            added: addedLayers,
            removed: removedLayers,
            moved: movedLayers
        };
    };

    Document.prototype._applyChange = function (rawChange) {
        assert.strictEqual(this._id, rawChange.id, "Document ID mismatch");
        assert.strictEqual(this._version, rawChange.version, "Version mismatch.");

        if (rawChange.count <= this._count) {
            console.warn("Skipping out of order change.");
            return;
        }

        assert(this._timeStamp <= rawChange.timeStamp, "Out of order timestamp.");

        this._count = rawChange.count;
        this._timeStamp = rawChange.timeStamp;

        var changes = [],
            change;

        // updated properties
        if (rawChange.hasOwnProperty("file")) {
            change = this._updateFile(rawChange.file);
            changes.file = change;
        }

        if (rawChange.hasOwnProperty("globalLight")) {
            change = this._updateGlobalLight(rawChange.globalLight);
            change.globalLight = change;
        }

        if (rawChange.hasOwnProperty("bounds")) {
            change = this._updateBounds(rawChange.bounds);
            change.bounds = change;
        }

        if (rawChange.hasOwnProperty("resolution")) {
            change = this._updateResolution(rawChange.resolution);
            change.resolution = change;
        }

        if (rawChange.hasOwnProperty("selection")) {
            change = this._updateSelection(rawChange.selection);
            change.selection = change;
        }

        if (rawChange.hasOwnProperty("generatorSettings")) {
            change = this._updateGeneratorSettings(rawChange.generatorSettings);
            change.generatorSettings = change;
        }

        if (rawChange.hasOwnProperty("layers")) {
            change = this._updateLayers(rawChange.layers);
            change.layers = change;
        }

        if (rawChange.hasOwnProperty("comps")) {
            change = this._updateComps(rawChange.comps);
            change.comps = change;
        }

        if (rawChange.hasOwnProperty("placed")) {
            change = this._updatePlaced(rawChange.placed);
            change.placed = change;
        }

        // change notifications
        if (rawChange.hasOwnProperty("closed")) {
            change = this._updateClosed(rawChange.closed);
            change.closed = change;
        }

        if (rawChange.hasOwnProperty("active")) {
            change = this._updateActive(rawChange.active);
            change.active = change;
        }

        if (rawChange.hasOwnProperty("merged")) {
            change = this._updateMerged(rawChange.merged);
            change.merged = change;
        }

        if (rawChange.hasOwnProperty("flattened")) {
            change = this._updateFlattened(rawChange.flattened);
            change.flattened = change;
        }
    };

    Document.prototype.toString = function () {
        var layerStrings = this._layers.layers.map(function (l) {
            return l.toString();
        });
        
        return "Document " + this.id + " [" + layerStrings.join(", ") + "]";
    };

    module.exports = Document;
}());