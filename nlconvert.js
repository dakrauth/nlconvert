var Convert = (function() {
    var Formula = function(from_unit, to_unit, conversion) {
        this.from_unit = from_unit;
        this.to_unit = to_unit;
        this.conversion = conversion;
    };
    Formula.make = function(fu, tu, c) {
        return new Formula(fu, tu, c);
    };

    var initial_formulas = (function(formulas) {
        var objs = formulas.map(function(f) { return Formula.make.apply(null, f); });
        return objs;
    }([   ['acre',         'hectare',      0.4047]
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
        , ['cup',          'milliliter',   240]
        , ['cup',          'ounce',        8]
        , ['foot',         'meter',        0.3048]
        , ['foot^2',       'inch^2',       144]
        , ['foot^2',       'meter^2',      0.0929]
        , ['foot^3',       'inch^3',       1728]
        , ['foot^3',       'meter^3',      0.02832]
        , ['fluid ounce',  'inch^3',       1.878]
        , ['fluid ounce',  'liter',        0.0296]
        , ['fluid ounce',  'tablespoon',   2]
        , ['gallon',       'liter',        3.785]
        , ['gram',         'ounce',        0.03527]
        , ['hectare',      'mile^2',       3.8612]
        , ['inch',         'millimeter',   25.4]
        , ['inch^2',       'millimeter^2', 645.16]
        , ['inch^3',       'pint',         0.0347]
        , ['inch^3',       'centiliter',   1.639]
        , ['int',          'hex',          function(i) { return '0x' + i.toString(16); }]
        , ['int',          'exp',          function(i) { return i.toExponential(); }]
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
        , ['tablespoon',   'milliliter',   15]
        , ['tablespoon',   'teaspoon',     3]
        , ['teaspoon',     'milliliter',   5]
        , ['yard^2',       'foot^2',       9]
    ]));
    
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
        , ['cup',          '+s',           null]
        , ['exp',          null,           null]
        , ['fahrenheit',   null,           'f']
        , ['fluid ounce',  '+s',           'floz,fl oz']
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
        , ['stone',        '+s',           'st']
        , ['tablespoon',   '+s',           'tb,tbl,tbs']
        , ['teaspoon',     '+s',           'tsp,tsps']
        , ['yard',         '+s',           'yd,yds']
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
    var Unit = function(single, plural, abbr, sig_digits) {
        this.id = 'u' + unit_id++;
        this.abbr = abbr;
        this.single = single;
        this.plural = plural;
        this.conversions = [];
        this.sig_digits = sig_digits || 4;
    };
    Unit.prototype = {
        formats: function(value) {
            var label = value === 1 ? this.single : this.plural;
            if(is_number(value)) {
                value = value.toFixed(4).toString().replace(/([.]\d+?)(0+)$/, '$1 ');
            }
            return [value, label];
        },
        add_converter: function(converter) {
            this.conversions.push(converter);
        },
        convert_all: function(value) {
            return this.conversions.map(function(converter) {
                return converter.convert(value);
            });
        }
    };
    
    var multiplier = function(value) { return function(input) { return input * value; } };
    var Result = function(value, unit) {
        this.value = value;
        this.unit = unit;
    };
    Result.prototype = {
        formats: function() {
            return this.unit.formats(this.value);
        },
        toString: function() {
            return this.formats().join(' ');
        },
    };
    
    var Converter = function(to_unit, value) {
        this.value = value
        this.func = is_number(value) ? multiplier(value) : value;
        this.to_unit = to_unit;
    };
    Converter.prototype = {
        convert: function(value) {
            return new Result(this.func(value), this.to_unit);
        }
    };
    
    var UnitsOfMeasure = function(config, formulas) {
        this.units = {};
        config.forEach(function(u) { this.add.apply(this, u); }, this);
        formulas.forEach(function(e) { this.add_formula(e); }, this);
    };
    UnitsOfMeasure.prototype = {
        add_formula: function(formula) {
            if(this.has(formula.from_unit) && this.has(formula.to_unit)) {
                if(is_number(formula.conversion)) {
                    this.units[formula.to_unit].add_converter(
                        new Converter(this.units[formula.from_unit], 1 / formula.conversion)
                    );
                }
                this.units[formula.from_unit].add_converter(
                    new Converter(this.units[formula.to_unit], formula.conversion)
                );
                return true;
            }
            return false;
        },
        has: function(label) {
            return this.units.hasOwnProperty(label);
        },
        get: function(label) {
            return this.has(label) ? this.units[label] : null;
        },
        convert: function(value, label) {
            var unit = this.get(label);
            var conversions = null;
            if(!unit) {
                return conversions;
            }
            conversions = unit.convert_all(value);
            return {results: conversions, unit: unit};
        },
        _set: function(label, unit) {
            if(this.has(label)) {
                console.warn('Unit label already exists: ', label);
            }
            this.units[label] = unit;
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
    
    var UOM = new UnitsOfMeasure(unit_config, initial_formulas);
    var parse_expression = (function() {
        var num_re = /^([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE]([-+]?\d+))?)/;
        var frac_re = /^([-+])?(?:(\d+) +)?(\d+)\/([1-9]\d*)/;
        var parse_fraction = function(m) {
            var value = 0;
            if(m[2]) {
                value = parseInt(m[2]);
            }
            value += parseInt(m[3]) / parseInt(m[4]);
            return m[1] === '-' ? -value : value;
        };
        
        var parse = function(text) {
            var label   = '',
                value = false,
                match = frac_re.exec(text);
                
            if(match) {
                match = frac_re.exec(text);
                if(match) {
                    value = parse_fraction(match);
                }
            }
            else {
                match = num_re.exec(text);
                if(match) {
                    value = parseFloat(match[0])
                }
                else {
                    console.log('parse_expression fail:', text);
                }
            }

            if(match) {
                label = text.substr(match[0].length).trim().toLowerCase() || 'int';
            }
            return value ? {value: value, label: label, text: text} : null;
        };
        
        if(true) {
            console.table([
                "1 gr",
                "12 F",
                "3 4/5 oz",
                "45 56/67",
                "1/2 m",
                "23/4",
                "-2/3",
                "+2/3"
            ].map(function(i) { return parse(i); }));
        }
        return parse;
    }());
    
    return {
        register_input_handler: function(el, handler, uom) {
            el.addEventListener('input', function(e) {
                var ex = parse_expression(e.target.value);
                var res = null;
                if(ex && ex.label) {
                    uom = uom || UOM;
                    res = uom.convert(ex.value, ex.label);
                };
                handler.call(this, res);
            }, false);
        },
        parse: parse_expression,
        swap_caret: function(text) {
            if(text instanceof Result) {
                text = text.toString();
            }
            return text.replace(/\^(\d)/, '&sup$1;');
        },
        UOM: UOM
    }
}());
