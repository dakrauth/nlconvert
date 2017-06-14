var Convert = (function() {
    "use strict";
    var debugMode = false;

    var multiplier = function(value) {
        return function(input) { return input * value; }
    };

    var createFormula = function(fromUnit, toUnit, conversion) {
        return {
            'fromUnit': fromUnit,
            'toUnit': toUnit,
            'conversion': conversion
        };
    };

    var isNumber = function(o) {
        return typeof o === 'number';
    };
    
    var pluralize = function(single, fmt) {
        var suffix = '';
        var i = single.indexOf('^');
        var hasToken = (fmt[0] === '+');
        if(i > -1 && hasToken) {
            suffix = single.substr(i);
            single = single.substring(0, i);
        }
        return hasToken ? single + fmt.substr(1) + suffix: fmt;
    };

    var annotate = function(f, descr) {
        f.description = descr;
        return f;
    };

    var annotations = {
        c2f:   annotate(function(c) { return c * 9/5 + 32; }, 'C * 9 / 5 + 32'),
        f2c:   annotate(function(f) { return (f  - 32) * 5/9; }, '(F - 32) * 5 / 9'),
        i2hex: annotate(function(i) { return '0x' + i.toString(16); }, 'HEX'),
        i2e:   annotate(function(i) { return i.toExponential(); }, 'EXP'),
    };

    var initialFormulas = [
        // from Unit     to Unit         conversion        
        ['acre',         'hectare',      0.4047],
        ['acre',         'meter^2',      4046.86],
        ['acre',         'yard^2',       4840],
        ['atmosphere',   'pounds/in^2',  14.696],
        ['barrel',       'meter^3',      0.159],
        ['bushel',       'liter',        36.4],
        ['celsius',      'fahrenheit',   annotations.c2f],
        ['centiliter',   'pint',         0.0211],
        ['centimeter',   'inch',         0.3937],
        ['centimeter^2', 'inch^2',       0.155],
        ['centimeter^3', 'inch^3',       0.06102],
        ['cup',          'milliliter',   240],
        ['cup',          'ounce',        8],
        ['cup',          'tablespoon',   16],
        ['fahrenheit',   'celsius',      annotations.f2c],
        ['foot',         'meter',        0.3048],
        ['foot^2',       'inch^2',       144],
        ['foot^2',       'meter^2',      0.0929],
        ['foot^3',       'inch^3',       1728],
        ['foot^3',       'meter^3',      0.02832],
        ['fluid ounce',  'inch^3',       1.878],
        ['fluid ounce',  'liter',        0.0296],
        ['fluid ounce',  'tablespoon',   2],
        ['gallon',       'liter',        3.785],
        ['gram',         'ounce',        0.03527],
        ['hectare',      'mile^2',       3.8612],
        ['inch',         'millimeter',   25.4],
        ['inch^2',       'millimeter^2', 645.16],
        ['inch^3',       'pint',         0.0347],
        ['inch^3',       'centiliter',   1.639],
        ['int',          'hex',          annotations.i2hex],
        ['int',          'exp',          annotations.i2e],
        ['league',       'mile',         3],
        ['league',       'kilometer',    3 * 0.6214],
        ['kilogram',     'pound',        2.205],
        ['kilometer',    'mile',         0.6214],
        ['kilometer^2',  'mile^2',       0.3861],
        ['kilometer^2',  'hectare',      100],
        ['knot',         'mph',          1.151],
        ['liter',        'pint',         2.1133],
        ['meter',        'yard',         1.094],
        ['meter^2',      'yard^2',       1.196],
        ['meter^3',      'yard^3',       1.308],
        ['mile^2',       'acre',         640],
        ['pint',         'fluid ounce',  16],
        ['quart',        'liter',        0.9463],
        ['rod',          'yard',         5.5],
        ['stone',        'pound',        14],
        ['stone',        'kilogram',     6.35],
        ['tablespoon',   'milliliter',   15],
        ['tablespoon',   'teaspoon',     3],
        ['teaspoon',     'milliliter',   5],
        ['yard^2',       'foot^2',       9]
    ].map(function(f) { return createFormula.apply(null, f); });
    
    var unitConfig = [
        // Name          Plural format   Abbreviations
        ['acre',         '+s',           null],
        ['barrel',       '+s',           null],
        ['bushel',       '+s',           'bush'],
        ['celsius',      null,           'c'],
        ['centiliter',   '+s',           'cl'],
        ['centimeter',   '+s',           'cm'],
        ['centimeter^2', '+s',           'cm2'],
        ['centimeter^3', '+s',           'cm3'],
        ['cup',          '+s',           null],
        ['exp',          null,           null],
        ['fahrenheit',   null,           'f'],
        ['fluid ounce',  '+s',           'floz,fl oz'],
        ['foot',         'feet',         'ft'],
        ['foot^2',       'feet^2',       'ft2'],
        ['foot^3',       'feet^3',       'ft3'],
        ['fathom',       '+s',           null],
        ['furlong',      '+s',           null],
        ['gallon',       '+s',           'gal'],
        ['gram',         '+s',           'g'],
        ['hectare',      '+s',           'hect'],
        ['hex',          null,           null],
        ['inch',         '+es',          'in'],
        ['inch^2',       '+es',          'in2'],
        ['inch^3',       '+es',          'in3'],
        ['int',          null,           null],
        ['kilogram',     '+s',           'kg'],
        ['kilometer',    '+s',           'km'],
        ['kilometer^2',  '+s',           'km2'],
        ['knot',         '+s',           'kn'],
        ['league',       '+s',           'lg'],
        ['liter',        '+s',           'l'],
        ['meter',        '+s',           'm'],
        ['meter^2',      '+s',           'm2'],
        ['meter^3',      '+s',           'm3'],
        ['mile',         '+s',           'mi'],
        ['mile^2',       '+s',           'mi2'],
        ['milligram',    '+s',           'mg'],
        ['millimeter',   '+s',           'mm'],
        ['millimeter^2', '+s',           'mm2'],
        ['milliliter',   '+s',           'ml'],
        ['mph',          null,           null],
        ['ounce',        '+s',           'oz'],
        ['pint',         '+s',           'pt,pts'],
        ['pound',        '+s',           'lb,lbs'],
        ['quart',        '+s',           'qt,qts'],
        ['rod',          '+s',            null],
        ['stone',        '+s',           'st'],
        ['tablespoon',   '+s',           'tb,tbl,tbs'],
        ['teaspoon',     '+s',           'tsp,tsps'],
        ['yard',         '+s',           'yd,yds'],
        ['yard^2',       '+s',           'yd2,yds2'],
        ['yard^3',       '+s',           'yd3,yds3']
    ];
    
    var formatNumber = function(obj) {
        var value = obj;
        var bits;
        if(parseFloat(value) === 0) {
            return '0';
        }
        else {
            value = value.toFixed(4).toString();
            bits = value.split('.');
            if(bits.length == 2) {
                bits[1] = bits[1].replace(/0+$/, '');
                value = bits[1] ? bits.join('.') : bits[0];
            }
        }
        return value;
    };

    var unitId = 0;
    var Unit = Object.create({ 
        init: function(single, plural, abbr, sigDigits) {
            this.id = 'u' + unitId++;
            this.abbr = abbr;
            this.single = single;
            this.plural = plural;
            this.conversions = [];
            this.sigDigits = sigDigits || 4;
            return this;
        },
        formats: function(value) {
            var label = value === 1 ? this.single : this.plural;
            if(isNumber(value)) {
                value = formatNumber(value);
            }
            return [value, label];
        },
        addConverter: function(converter) {
            this.conversions.push(converter);
        },
        convertAll: function(value) {
            return this.conversions.map(function(converter) {
                return converter.convert(value);
            });
        },
    });

    var Result = Object.create({
        init: function(value, unit) {
            this.value = value;
            this.unit = unit;
            return this;
        },
        formats: function() {
            return this.unit.formats(this.value);
        },
        toString: function() {
            return this.formats().join(' ');
        }
    });
    
    var Converter = Object.create({
        init: function(toUnit, value) {
            this.value = value
            this.func = isNumber(value) ? multiplier(value) : value;
            this.toUnit = toUnit;
            return this;
        },
        convert: function(value) {
            return Object.create(Result).init(this.func(value), this.toUnit);
        },
        valueRepr: function() {
            var value = this.value;
            if(typeof value === 'number') {
                value = (value < 0.0001) ? value.toFixed(6) : value.toFixed(value >= 1 ? 3 : 4);
                return value.replace(/[.]0+$/, '');
            }
            if(typeof value === 'function' && value.description) {
                return value.description;
            }
            value = value.toString();
            value = value.substring(value.indexOf('{') + 1, value.indexOf('}'));
            return value.replace('return ', '').replace(';', '');
        }
    });
    
    var UnitsOfMeasure = Object.create({
        init: function(config, formulas) {
            this.units = {};
            config.forEach(function(u) { this.add.apply(this, u); }, this);
            formulas.forEach(function(e) { this.addFormula(e); }, this);
            return this;
        },
        addFormula: function(formula) {
            if(this.has(formula.fromUnit) && this.has(formula.toUnit)) {
                if(isNumber(formula.conversion)) {
                    this.units[formula.toUnit].addConverter(
                        Object.create(Converter).init(
                            this.units[formula.fromUnit],
                            1 / formula.conversion
                        )
                    );
                }
                this.units[formula.fromUnit].addConverter(
                    Object.create(Converter).init(
                        this.units[formula.toUnit],
                        formula.conversion
                    )
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
            conversions = unit.convertAll(value);
            return {results: conversions, unit: unit};
        },
        _set: function(label, unit) {
            if(this.has(label)) {
                console.warn('Unit label already exists: ', label);
            }
            this.units[label] = unit;
        },
        add: function(name, pluralFmt, abbr) {
            var plural = pluralize(name, pluralFmt || name);
            var abbrs = abbr ? abbr.split(',') : [''];
            var unit = Object.create(Unit).init(name, plural, abbrs);
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
    });
    
    var unitsOfMeasure = Object.create(UnitsOfMeasure).init(unitConfig, initialFormulas);
    var parseFraction = function(m) {
        var value = 0;
        if(m[2]) {
            value = parseInt(m[2]);
        }
        value += parseInt(m[3]) / parseInt(m[4]);
        return m[1] === '-' ? -value : value;
    };
    
    var parseExpression = (function() {
        var numRe = /^([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE]([-+]?\d+))?)/;
        var fracRe = /^([-+])?(?:(\d+) +)?(\d+)\/([1-9]\d*)/;
        var parseFraction = function(m) {
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
                match = fracRe.exec(text);
                
            if(match) {
                match = fracRe.exec(text);
                if(match) {
                    value = parseFraction(match);
                }
            }
            else {
                match = numRe.exec(text);
                if(match) {
                    value = parseFloat(match[0])
                }
                else {
                    console.log('parseExpression fail:', text);
                }
            }

            if(match) {
                label = text.substr(match[0].length).trim().toLowerCase() || 'int';
            }
            return value ? {value: value, label: label, text: text} : null;
        };
        
        return parse;
    }());
    
    var merge = function() {
        var obj = {};
        var arg, i, prop;
        for(i = 0; i < arguments.length; i++) {
            arg = arguments[i];
            for(prop in arg) {
                if(arg.hasOwnProperty(prop)) {
                    obj[prop] = arg[prop];
                }
            }
        }
        return obj;
    };

    var defaultConversionHandler = function(conversions, opts) {
        var container = document.querySelector(opts.resultsContainer);
        var ul = createElement('ul');
        ul.className = opts.resultsGroupClass || '';
        while(container.lastChild) {
            container.removeChild(container.lastChild);
        }
        //console.log(conversions);
        if(conversions && conversions.results.length) {
            conversions.results.forEach(function(result) {
                var formats = result.formats();
                var child = createElement('li');
                child.className = opts.resultsItemClass;
                child.appendChild(createElement('span', formats[0]));
                child.appendChild(createElement(
                    'span',
                    ' ' + Convert.swapCaret(formats[1])
                ));
                ul.appendChild(child);
            });
        }
        container.appendChild(ul);
    };

    var createElement = function(tag, props) {
        var el = document.createElement(tag);
        var prop;
        if(props) {
            if(typeof props === 'string') {
                el.innerHTML = props;
            }
            else {
                for(var prop in props) {
                    el[prop] = props[prop]
                }
            }
        }
        return el;
    };

    var buildHelp = function(opts, units) {
        var seen = {};
        var table = createElement('table', {className: opts.helpTableClass});
        var tbody = createElement('tbody');
        var thead = createElement('thead');
        var tr = createElement('tr');
        var headText = ['From', 'Shortcuts', 'To', 'Multiply by'];
        thead.appendChild(tr);
        table.appendChild(thead);
        table.appendChild(tbody);
        headText.forEach(function(t) {
            tr.appendChild(createElement('th', t));
        });
        
        Object.getOwnPropertyNames(units).forEach(function(key) {
            var unit = units[key];
            if(!seen.hasOwnProperty(unit.id)) {
                seen[unit.id] = true;
                unit.conversions.forEach(function(conv) {
                    tr = createElement('tr');
                    tr.appendChild(createElement('td', Convert.swapCaret(unit.single)));
                    if(unit.abbr) {
                        tr.appendChild(createElement(
                            'td',
                            unit.abbr.join(", ")
                        ));
                    }
                    
                    tr.appendChild(createElement('td', Convert.swapCaret(conv.toUnit.single)));
                    tr.appendChild(createElement('td', conv.valueRepr()));
                    tbody.appendChild(tr);
                });
            }
        });
        document.querySelector(opts.helpElement).appendChild(table);
    };

    var DEFAULT_CONF = {
        conversionInput: '#convert-input',
        conversionHandler: defaultConversionHandler,
        
        resultsGroupClass: 'list-group',
        resultsItemClass: 'list-group-item',
        resultsContainer: '#convert-results',

        helpElement: false,
        helpTableClass: 'table table-striped table-bordered'
    };
    
    return {
        initialize: function(userOptions) {
            var options = merge(DEFAULT_CONF, userOptions || {});
            var convInputEl = document.querySelector(options.conversionInput);
            if(options.helpElement) {
                buildHelp(options, unitsOfMeasure.units);    
            }
            

            convInputEl.addEventListener('input', function(e) {
                var ex = parseExpression(e.target.value);
                var res = null;
                if(ex && ex.label) {
                    res = unitsOfMeasure.convert(ex.value, ex.label);
                };
                options.conversionHandler.call(null, res, options);
            }, false);
            
            if(convInputEl.value) {
                convInputEl.dispatchEvent(new Event('input'));   
            }
        },
        parseFraction: parseFraction,
        parseExpression: parseExpression,
        swapCaret: function(text) {
            return text.toString().replace(/\^(\d)/, '&sup$1;');
        },
        unitsOfMeasure: unitsOfMeasure,
        debugExpressions: function() {
            console.table([
                "1 gr butter",
                // "12 F",
                // "3 4/5 oz",
                // "45 56/67",
                // "1/2 m",
                // "23/4",
                // "-2/3",
                // "+2/3"
            ].map(function(i) { return parseExpression(i); }));
        }
    }
}());
