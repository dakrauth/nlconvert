var Convert = (function() {
    var formula_config = [
          ['acre',         'hectare',      0.4047]
        , ['acre',         'meter^2',      4046.86]
        , ['acre',         'yard^2',       4840]
        , ['atmosphere',   'pounds/in^2',  14.696]
        , ['celsius',      'fahrenheit',   function(c) { return c * 9/5 + 32; }]
        , ['fahrenheit',   'celsius',      function(f) { return (f  - 32) * 5/9; }]
        , ['barrel',       'meter^3',      0.159]
        , ['bushel',       'liter',        36.4]
        , ['centiliter',   'pint',         0.0211]
        , ['centimeter',   'inch',         0.3937]
        , ['centimeter^2', 'inch^2',       0.155]
        , ['centimeter^3', 'inch^3',       0.06102]
        , ['foot',         'meter',        0.3048]
        , ['foot^2',       'inch^2',       144]
        , ['foot^2',       'meter^2',      0.0929]
        , ['foot^3',       'inch^3',       1728]
        , ['foot^3',       'meter^3',      0.02832]
        , ['fluid ounce',  'inch^3',       1.878]
        , ['fluid ounce',  'liter',        0.0296]
        , ['gallon',       'liter',        3.785]
        , ['gram',         'ounce',        0.03527]
        , ['hectare',      'mile^2',       3.8612]
        , ['inch',         'millimeter',   25.4]
        , ['inch^2',       'millimeter^2', 645.16]
        , ['inch^3',       'pint',         0.0347]
        , ['inch^3',       'centiliter',   1.639]
        , ['int',          'hex',          function(i) { return '0x' + i.toString(16); }]
        , ['kilogram',     'pound',        2.205]
        , ['kilometer',    'mile',         0.6214]
        , ['kilometer^2',  'mile^2',       0.3861]
        , ['kilometer^2',  'hectare',      100]
        , ['knot',         'mph',          1.151]
        , ['liter',        'pint',         2.1133]
        , ['meter',        'yard',         1.094]
        , ['meter^2',      'yard^2',       1.196]
        , ['meter^3',      'yard^3',       1.308]
        , ['mile^2',       'acre',         640]
        , ['pint',         'fluid ounce',  16]
        , ['quart',        'liter',        0.9463]
        , ['stone',        'pound',        14]
        , ['stone',        'kilogram',     6.35]
        , ['yard^2',       'foot^2',       9]
    ];
    var unit_config = [
        //  Name           Plural format   Abbreviations
          ['acre',         '+s',           null]
        , ['barrel',       '+s',           null]
        , ['bushel',       '+s',           'bush']
        , ['celsius',      null,           'c']
        , ['centiliter',   '+s',           'cl']
        , ['centimeter',   '+s',           'cm']
        , ['centimeter^2', '+s',           'cm2']
        , ['centimeter^3', '+s',           'cm3']
        , ['fahrenheit',   null,           'f']
        , ['fluid ounce',  '+s',           'floz, fl oz']
        , ['foot',         'feet',         'ft']
        , ['foot^2',       'feet^2',       'ft2']
        , ['foot^3',       'feet^3',       'ft3']
        , ['gallon',       '+s',           'gal']
        , ['gram',         '+s',           'g']
        , ['hectare',      '+s',           'hect']
        , ['hex',          null,           null]
        , ['inch',         '+es',          'in']
        , ['inch^2',       '+es',          'in2']
        , ['inch^3',       '+es',          'in3']
        , ['int',          null,           null]
        , ['kilogram',     '+s',           'kg']
        , ['kilometer',    '+s',           'km']
        , ['kilometer^2',  '+s',           'km2']
        , ['knot',         '+s',           'kn']
        , ['liter',        '+s',           'l']
        , ['meter',        '+s',           'm']
        , ['meter^2',      '+s',           'm2']
        , ['meter^3',      '+s',           'm3']
        , ['mile',         '+s',           'mi']
        , ['mile^2',       '+s',           'mi2']
        , ['milligram',    '+s',           'mg']
        , ['millimeter',   '+s',           'mm']
        , ['millimeter^2', '+s',           'mm2']
        , ['milliliter',   '+s',           'ml']
        , ['mph',          null,           null]
        , ['ounce',        '+s',           'oz']
        , ['pint',         '+s',           'pt,pts']
        , ['pound',        '+s',           'lb,lbs']
        , ['quart',        '+s',           'qt,qts']
        , ['yard',         '+s',           'yd,yds']
        , ['stone',        '+s',           'st']
        , ['yard^2',       '+s',           'yd2,yds2']
        , ['yard^3',       '+s',           'yd3,yds3']
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
    var unit_id = 0;
    var Unit = function(single, plural, abbr) {
        this.id = 'u' + unit_id++;
        this.abbr = abbr;
        this.single = single;
        this.plural = plural;
        this.conversions = [];
    };
    Unit.prototype = {
        render: function(value) {
            if(is_number(value)) {
                var parsed = parseInt(value);
                if(value === parsed) {
                    return value + ' ' + (parsed === 1 ? this.single : this.plural);
                }
                var fmt = value.toFixed(4).toString().replace(/([.]\d+?)(0+)$/, '$1 ');
                return fmt + ' ' + (value === 1 ? this.single : this.plural);
            }
            return value;
        },
        add_converter: function(converter) {
            this.conversions.push(converter);
        },
        convert_all: function(value) {
            return this.conversions.map(function(converter) {
                return converter.render(value);
            });
        }
    };
    
    var multiplier = function(value) { return function(input) { return input * value; } };
    var Converter = function(to_unit, value) {
        this.value = value
        this.func = is_number(value) ? multiplier(value) : value;
        this.to_unit = to_unit;
    };
    Converter.prototype = {
        render: function(value) {
            return this.to_unit.render(this.func(value));
        }
    };
    
    var UnitsOfMeasure = function(config) {
        this.initialize(config);
    };
    UnitsOfMeasure.prototype = {
        initialize: function(config) {
            this.units = {};
            config.forEach(function(u) { this.add.apply(this, u); }, this);
        },
        add_converter: function(to_unit, from_unit, num) {
            if(this.has(from_unit) && this.has(to_unit)) {
                if(is_number(num)) {
                    this.units[to_unit].add_converter(
                        new Converter(this.units[from_unit], 1 / num)
                    );
                }
                this.units[from_unit].add_converter(new Converter(this.units[to_unit], num));
                return true;
            }
            return false;
        },
        has: function(key) {
            return this.units.hasOwnProperty(key);
        },
        get: function(key) {
            return this.has(key) ? this.units[key] : null;
        },
        convert: function(value, key) {
            var unit = this.get(key);
            var result = null;
            if(!unit) {
                return result;
            }
            result = unit.convert_all(value);
            return {values: result, unit: unit};
        },
        _set: function(key, unit) {
            if(this.has(key)) {
                console.warn('Unit key already exists: ', key);
            }
            this.units[key] = unit;
        },
        add: function(name, plural_fmt, abbr) {
            var plural = pluralize(name, plural_fmt || name);
            var abbrs = abbr ? abbr.split(',') : [''];
            var unit = new Unit(name, plural, abbrs)
            this._set(name, unit);
            if(abbrs[0]) {
                abbrs.forEach(function(a) {
                    this._set(a.trim(), unit);
                }, this);
            }
            if(name !== plural) {
                this._set(plural, unit);
            }
        }
    };
    
    var UOM = new UnitsOfMeasure(unit_config);
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
    
    formula_config.forEach(function(e) { UOM.add_converter.apply(UOM, e); });
    return {
        register_input_handler: function(el, handler, uom) {
            el.addEventListener('input', function(e) {
                var ex = parse_expression(e.target.value);
                var res = null;
                if(ex && ex.key) {
                    uom = uom || UOM;
                    res = uom.convert(ex.value, ex.key);
                };
                handler.call(this, res);
            }, false);
        },
        swap_caret: function(text) {
            return text.replace(/\^(\d)/, '&sup$1;');
        },
        UOM: UOM
    }
}());
