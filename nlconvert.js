var Converter = (function() {
    var formula_config = [
          ['acre', 'hectare', 0.4047]
        , ['acre', 'meter^2', 4046.86]
        , ['acre', 'yard^2', 4840]
        , ['atmosphere', 'pounds/in^2', 14.696]
        , ['celsius',    'fahrenheit', function(c) { return c * 9/5 + 32; }]
        , ['fahrenheit', 'celsius',    function(f) { return (f  - 32) * 5/9; }]
        , ['barrel', 'meter^3', 0.159]
        , ['bushel', 'liter', 36.4]
        , ['centiliter', 'pint', 0.0211]
        , ['centimeter', 'inch', 0.3937]
        , ['foot', 'meter', 0.3048]
        , ['foot^2', 'inch^2', 144]
        , ['foot^2', 'meter^2', 0.0929]
        , ['foot^3', 'inch^3', 1728]
        , ['foot^3', 'meter^3', 0.02832]
        , ['fluid ounce', 'inch^3', 1.878]
        , ['fluid ounce', 'liter', 0.0296]
        , ['gallon', 'liter', 3.785]
        , ['gram', 'ounce', 0.03527]
        , ['hectare', 'mile^2', 3.8612]
        , ['inch', 'millimeter', 25.4]
        , ['inch^2', 'millimeter^2', 645.16]
        , ['inch^3', 'pint', 0.0347]
        , ['int', 'hex', function(i) { return parseInt(i.toString(16)); }]
        , ['kilogram', 'pound', 2.205]
        , ['kilometer', 'mile', 0.6214]
        , ['kilometer^2', 'hectare', 100]
        , ['liter', 'pint', 2.1133]
        , ['meter', 'yard', 1.094]
        , ['meter^2', 'yard^2', 1.196]
        , ['mile^2', 'acre', 640]
        , ['pint', 'fluid ounce', 16]
        , ['quart', 'liter', 0.9463]
        , ['stone', 'pound', 14]
        , ['yard^2', 'foot^2', 9]

        // , ['atmosphere', 'kilograms/m^2', 10332]
        // , ['centimeter^2', 'foot^2', 0.001076]
        // , ['centimeter^2', 'inch^2', 0.155]
        // , ['centimeter^3', 'inch^3', 0.06102]
        // , ['fathom', 'foot', 6]
        // , ['foot pound', 'kilogram force metre', 0.1383]
        // , ['gallon', 'quart', 4]
        // , ['gram', 'pound', 0.002205]
        // , ['horsepower (electrical)', 'watt', 746]
        // , ['horsepower (metric)', 'watt', 735.5]
        // , ['inch pound', 'foot pound', 12]
        // , ['inch^3', 'liter', 0.01639]
        // , ['kilogram force metre', 'foot pound', 7.233]
        // , ['kilogram', 'ton', 0.0009842]
        // , ['kilometer^2', 'mile^2', 0.3861]
        // , ['kilograms/m^2', 'pounds/in^2', 0.001422]
        // , ['kilometer/hour', 'miles/hour', 0.6117]
        // , ['kilometer/liter', 'miles/gallon', 2.353]
        // , ['knot', 'mph', 1.151]
        // , ['league', 'mile', 3]
        // , ['liter', 'decimeter^3', 1]
        // , ['liters/kilometre', 'gallons/mile', 0.354]
        // , ['meter^2', 'centimeter^2', 10000]
        // , ['meter^3', 'centimeter^3', 1000000]
        // , ['meter^3', 'yard^3', 1.308]
        // , ['mile', 'furlong', 8]
        // , ['mile', 'rod', 320]
        // , ['nautical mile', 'foot', 6072]
        // , ['nautical mile', 'mile', 1.15]
        // , ['nautical mile', 'kilometer', 1.852]
        // , ['peck', 'gallon', 2]
        // , ['pound', 'ounce', 16]
        // , ['quart', 'pint', 2]
        // , ['shackle', 'fathom', 15]
        // , ['short ton', 'pound', 2000]
        // , ['short ton', 'tonne', 0.907]
        // , ['stone', 'kilogram', 6.35]
        // , ['ton', 'pound', 2240]
        // , ['tonne', 'kilogram', 1000]
        // , ['tonne', 'ton', 0.9842]
        // , ['gallons/mile', 'liters/kilometer', 2.825]
        // , ['foot/minute', 'meter/minute', 0.305]
        // , ['foot/minute', 'meter/second', 0.00508]
    ];
    
    var unit_config = [
          ['acre',         '+s',     'acre']
        , ['barrel',       '+s',     'barrel']
        , ['bushel',       '+s',     'bush']
        , ['celsius',      null,     'c']
        , ['centiliter',   '+s',     'cl']
        , ['centimeter',   '+s',     'cm']
        , ['fahrenheit',   null,     'f']
        , ['fluid ounce',  '+s',     'floz']
        , ['foot',         'feet',   'ft']
        , ['foot^2',       'feet^2', 'ft2']
        , ['foot^3',       'feet^3', 'ft3']
        , ['gallon',       '+s',     'gal']
        , ['gram',         '+s',     'g']
        , ['hectare',      '+s',     'hect']
        , ['hex',          null,     null]
        , ['inch',         '+es',    'in']
        , ['inch^2',       '+es',    'in2']
        , ['inch^3',       '+es',    'in3']
        , ['int',          null,     null]
        , ['kilogram',     '+s',     'kg']
        , ['kilometer',    '+s',     'km']
        , ['kilometer^2',  '+s',     'km2']
        , ['liter',        '+s',     'l']
        , ['meter',        '+s',     'm']
        , ['meter^2',      '+s',     'm2']
        , ['meter^3',      '+s',     'm3']
        , ['mile',         '+s',     'mi']
        , ['mile^2',       '+s',     'mi2']
        , ['milligram',    '+s',     'mg']
        , ['millimeter',   '+s',     'mm']
        , ['millimeter^2', '+s',     'mm2']
        , ['milliliter',   '+s',     'ml']
        , ['ounce',        '+s',     'oz']
        , ['pint',         '+s',     'pt']
        , ['quart',        '+s',     'qt']
        , ['yard',         '+s',     'yd']
        , ['yard^2',       '+s',     'yd2']
    ];
    var is_number = function(o) { return typeof o === 'number'; }
    
    var pluralize = function(single, fmt) {
        var suffix = '';
        var i = single.indexOf('^');
        var has_token = (fmt[0] === '+');
        if(i > -1 && has_token) {
            suffix = single.substr(i);
            single = single.substring(0, i);
        }
        return has_token ? single + fmt.substr(1) + suffix: fmt;
    };
    
    var Unit = function(single, plural, abbr) {
        this.abbr = abbr;
        this.single = single;
        this.plural = pluralize(single, plural || single);
        this.conversions = [];
    }
    Unit.prototype.render = function(value) {
        var parsed = parseInt(value);
        if(value === parsed) {
            return value + ' ' + (parsed === 1 ? this.single : this.plural);
        }
        var fmt = value.toFixed(4).toString().replace(/([.]\d+?)(0+)$/, '$1 ');
        return fmt + ' ' + (value === 1 ? this.single : this.plural);
    };
    Unit.prototype.add_converter = function(converter) {
        this.conversions.push(converter);
    };
    Unit.prototype.convert_all = function(value) {
        return this.conversions.map(function(converter) {
            return converter.render(value);
        }).join(', ');
    }
    
    var Converter = function(to_unit, func) {
        this.func = func;
        this.to_unit = to_unit;
    };
    Converter.prototype.render = function(value) {
        return this.to_unit.render(this.func(value));
    };
    
    var units = (function(items) {
        var units = {};
        var multiplier = function(value) { return function(input) { return input * value; } };
        items.forEach(function(u) {
            units[u[0]] = units[u[2]] = new Unit(u[0], u[1], u[2]);
        })
        return {
            units: units,
            add_converter: function(to_unit, from_unit, num) {
                if(!(units.hasOwnProperty(from_unit) && units.hasOwnProperty(to_unit))) {
                    return false;
                }
                if(is_number(num)) {
                    units[to_unit].add_converter(
                        new Converter(units[from_unit], multiplier(1 / num))
                    );
                    num = multiplier(num);
                }
                units[from_unit].add_converter(new Converter(units[to_unit], num));
                return true;
            },
            get: function(key) {
                return units.hasOwnProperty(key) ? units[key] : null;
            },
            convert: function(value, key) {
                var unit = this.get(key);
                console.log('unit', unit);
                return unit ? unit.convert_all(value) : '';
            }
        };
    }(unit_config));
    
    var formulas = (function(items) {
        items.forEach(function(e) {
            var from_unit = e[0];
            var to_unit = e[1];
            var val = e[2];
            if(is_number(val)) {
                items.push([to_unit, from_unit, 1 / val]);
            }
            units.add_converter(to_unit, from_unit, val);
        });
        return items;
    }(formula_config));
    
    var parse_expression = (function() {
        var float_re = /^([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE]([-+]?\d+))?)/;
        return function(text) {
            var value = float_re.exec(text);
            var key = text.substr(value[0].length).trim().toLowerCase();
            return value ? {
                'value': parseFloat(value[0]),
                'key': (key && key.length) ? key : 'int'
            } : null;
        };
    }());
    
    console.log('units', units);
    
    return {
        input_handler: function(e) {
            var ex = parse_expression(e.target.value);
            console.log('Input:', e.target.value, ex);
            var res = (ex && ex.key) ? units.convert(ex.value, ex.key) : '';
            e.target.nextSibling.textContent = (res && res.length) ? res : 'Unknown conversion';
        },
        formulas: formulas
    }
}());
