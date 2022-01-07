"use strict";

const swapCaret = text => text ? text.toString().replace(/\^(\d)/, '&sup$1;') : '';
const isNumber = o => typeof o === 'number';
const multiplier = value => function(input) { return input * value; };
const has = (obj, prop) => obj.hasOwnProperty(prop);

const removeChildren = function(container) {
    while(container.lastChild) {
        container.removeChild(container.lastChild);
    }
    return container;
};

const pluralize = function(single, fmt) {
    let suffix = '';
    const i = single.indexOf('^');
    const hasToken = (fmt[0] === '+');
    if(i > -1 && hasToken) {
        suffix = single.substr(i);
        single = single.substring(0, i);
    }
    return hasToken ? single + fmt.substr(1) + suffix: fmt;
};

const annotate = function(f, descr) {
    f.description = descr;
    return f;
};

const formatNumber = function(obj) {
    if(parseFloat(obj) === 0) {
        return '0';
    }

    let bits = obj.toFixed(4).split('.');
    bits[0] = parseInt(bits[0]).toLocaleString()
    bits[1] = bits[1].replace(/0+$/, '');
    return bits[1] ? bits.join('.') : bits[0];
};

let unitId = 0;

class Unit { 
    constructor(name, plural, abbrs, precision=4) {
        this.id = 'u' + unitId++;
        this.abbrs = abbrs ? abbrs.split(',') : [];
        this.name = name;
        this.plural = pluralize(name, plural || name);
        this.conversions = [];
        this.precision = precision;
    }
    format(value) {
        return {
            value: isNumber(value) ? formatNumber(value) : value,
            label: value === 1 ? this.name : this.plural
        };
    }
}

class Result {
    constructor(value, unit) {
        this.value = value;
        this.unit = unit;
    }
    format() {
        return this.unit.format(this.value);
    }
}

class Converter {
    constructor(fromUnit, toUnit, value) {
        this.value = value
        this.func = isNumber(value) ? multiplier(value) : value;
        this.toUnit = toUnit;
        this.fromUnit = fromUnit;
    }
    convert(value) {
        return new Result(this.func(value), this.toUnit);
    }
    invert() {
        return new Converter(this.toUnit, this.fromUnit, 1 / this.value);
    }
    valueRepr() {
        let value = this.value;
        if(isNumber(value)) {
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
}

class UnitsOfMeasure {
    constructor(units) {
        this.units = {};
        this.unitConversions = {};
        this.addUnits(units);
    }
    addUnits(units) {
        let conversion_queue = [];
        for(const [key, attrs] of Object.entries(units)) {
            let unit = this._addUnit(key, attrs.plural, attrs.abbrs);
            if(attrs.conversions) {
                unit.conversions = attrs.conversions;
                conversion_queue.push({fromUnit: unit, conversions: attrs.conversions});
            }
        }
        for(const pending of conversion_queue) {
            for(const [name, value] of Object.entries(pending.conversions)) {
                let toUnit = this.unit(name);
                if(!toUnit) {
                    toUnit = this._addUnit(name, name);
                }
                this._addConverter(pending.fromUnit, toUnit, value)
            }
        }
    }
    _getOrCreateConversions(name) {
        if(!has(this.unitConversions, name)) {
            this.unitConversions[name] = {};
        }
        return this.unitConversions[name];
    }
    _addConverter(fromUnit, toUnit, value) {
        if(0 && (fromUnit.name == 'acre' || fromUnit.name == 'hectare')) {
            debugger;
        }
        const converter = new Converter(fromUnit, toUnit, value);
        this._getOrCreateConversions(fromUnit.name)[toUnit.name] = converter;
        if(!has(toUnit.conversions, fromUnit.name) && isNumber(value)) {
            this._getOrCreateConversions(toUnit.name)[fromUnit.name] = converter.invert();
        }
    }
    _addUnit(unitName, plural, abbrs) {
        let unit = this._set(unitName, new Unit(unitName, plural, abbrs));
        for(const abbr of unit.abbrs) {
            this._set(abbr, unit);
        }
        return unit;
    }
    unit(label) {
        return has(this.units, label) ? this.units[label] : null;
    }
    conversions(label) {
        return has(this.unitConversions, label) ? this.unitConversions[label] : null;
    }
    convert(value, label) {
        const unit = this.unit(label);
        if(unit) {
            const converters = this.conversions(unit.name);
            if(converters) {
                return {
                    results: Object.values(converters).map(function(conv) {
                      return conv.convert(value);
                    }),
                    unit: unit
                };
            }
        }
        return null;
    }
    _set(label, unit) {
        if(has(this.units, label)) {
            console.warn('Unit label already exists: ', label);
        }
        this.units[label] = unit;
        return unit;
    }
    helpMatrix() {
        let keys = Object.keys(this.unitConversions);
        let matrix = [];
        keys.sort();
        for(const key of keys) {
            const unit = this.unit(key);
            const converters = this.conversions(key);
            for(const conv of Object.values(converters)) {
                matrix.push({
                    name: swapCaret(unit.name),
                    abbrs: unit.abbrs ? unit.abbrs.join(", ") : "",
                    toUnit: swapCaret(conv.toUnit.name),
                    value: conv.valueRepr()
                });
            }
        }
        return matrix;
    }
}

export const parser = {
    numRe: /^([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE]([-+]?\d+))?)/,
    fracRe: /^([-+])?(?:(\d+) +)?(\d+)\/([1-9]\d*)/,
    expression: function(value, label, text) {
        return {
            'value': value,
            'label': label,
            'text': text
        };
    },
    parseFraction: function(text, match) {
        let value = 0;
        if(!match) {
            match = parser.fracRe.exec(text);
            if(!match) {
                console.log('parseFraction fail:', text)
            }
        }
        if(match[2]) {
            value = parseInt(match[2]);
        }
        value += parseInt(match[3]) / parseInt(match[4]);
        let label = text.substr(match[0].length).trim();
        return parser.expression(
            match[1] === '-' ? -value : value,
            label || 'fraction',
            text
        );
    },
    parse: function(text) {
        let label = '';
        let value = false;
        let match = parser.fracRe.exec(text);
            
        if(match) {
            return parser.parseFraction(text, match)
        }

        match = parser.numRe.exec(text);
        if(match) {
            value = parseFloat(match[0]);
        }
        else {
            console.log('parser.parse fail:', text);
        }

        if(match) {
            label = text.substr(match[0].length).trim().toLowerCase() || 'number';
        }
        return value ? parser.expression(value, label, text) : null;
    }
};

const createElement = function(tag, props) {
    let el = document.createElement(tag);
    if(props) {
        if(typeof props === 'string') {
            el.innerHTML = props;
        }
        else {
            for(const prop in props) {
                el[prop] = props[prop]
            }
        }
    }
    return el;
};

const defaultConversionHandler = function(container, conversions, opts) {
    container = removeChildren(container);
    let ul = createElement('ul', {className: opts.resultsGroupClass || ''});

    if(conversions && conversions.results.length) {
        for(const result of conversions.results) {
            const format = result.format();
            let child = createElement('li');
            child.className = opts.resultsItemClass;
            child.appendChild(createElement('span', format.value));
            child.appendChild(createElement('span', ' ' + swapCaret(format.label)));
            ul.appendChild(child);
        }
    }
    container.appendChild(ul);
};

const buildHelp = function(parent, units, opts) {
    let table = createElement('table', {className: opts.helpTableClass});
    let tbody = createElement('tbody');
    let thead = createElement('thead');
    let tr = createElement('tr');
    thead.appendChild(tr);
    table.appendChild(thead);
    table.appendChild(tbody);
    ['From', 'Shortcuts', 'To', 'Multiply by'].forEach(function(t) {
        tr.appendChild(createElement('th', t));
    });

    for(const item of units.helpMatrix()) {
        tr = createElement('tr');
        tr.appendChild(createElement('td', item.name));
        tr.appendChild(createElement('td', item.abbrs));
        tr.appendChild(createElement('td', item.toUnit));
        tr.appendChild(createElement('td', item.value));
        tbody.appendChild(tr);
    };

    removeChildren(document.querySelector(parent)).appendChild(table);
};


const initialFormulas = {
    'acre': {
        'conversions': {'hectare': 0.4047, 'meter^2': 4046.86, 'yard^2': 4840},
        'plural': '+s',
        'abbrs': null
    },
    'atmosphere': {'conversions': {'pounds/in^2': 14.696}, 'plural': '+s', 'abbrs': 'atm'},
    'bar': {'conversions': {'atmosphere': 0.98692, 'pounds/in^2': 14.5038}, 'plural': '+s', 'abbrs': null},
    'barrel': {'conversions': {'meter^3': 0.159}, 'plural': '+s', 'abbrs': null},
    'bushel': {'conversions': {'liter': 36.4}, 'plural': '+s', 'abbrs': 'bush'},
    'celsius': {
        'conversions': {'fahrenheit': annotate(c => c * 9/5 + 32, 'C * 9 / 5 + 32')},
        'plural': null,
        'abbrs': 'c'
    },
    'centiliter': {'conversions': {'pint': 0.0211}, 'plural': '+s', 'abbrs': 'cl'},
    'centimeter': {'conversions': {'inch': 0.3937}, 'plural': '+s', 'abbrs': 'cm'},
    'centimeter^2': {'conversions': {'inch^2': 0.155}, 'plural': '+s', 'abbrs': 'cm2'},
    'centimeter^3': {'conversions': {'inch^3': 0.06102}, 'plural': '+s', 'abbrs': 'cm3'},
    'cup': {
        'conversions': {'milliliter': 240, 'ounce': 8, 'tablespoon': 16},
        'plural': '+s',
        'abbrs': null
    },
    'exp': {'plural': null, 'abbrs': null},
    'fahrenheit': {
        'conversions': {'celsius': annotate(f => (f  - 32) * 5/9, '(F - 32) * 5 / 9')},
        'plural': null,
        'abbrs': 'f'
    },
    'fathom': {conversions: {'feet': 6, 'meter': 1.8288}, 'plural': '+s', 'abbrs': null},
    'fluid ounce': {
        'conversions': {'inch^3': 1.878, 'liter': 0.0296, 'tablespoon': 2},
        'plural': '+s',
        'abbrs': 'floz,fl oz'
    },
    'foot': {'conversions': {'meter': 0.3048}, 'plural': 'feet', 'abbrs': 'ft'},
    'foot^2': {
        'conversions': {'inch^2': 144, 'meter^2': 0.0929},
        'plural': 'feet^2',
        'abbrs': 'ft2'},
    'foot^3': {
        'conversions': {'inch^3': 1728, 'meter^3': 0.02832},
        'plural': 'feet^3',
        'abbrs': 'ft3'
    },
    'furlong': {'plural': '+s', 'abbrs': null},
    'gallon': {'conversions': {'liter': 3.785}, 'plural': '+s', 'abbrs': 'gal'},
    'gram': {'conversions': {'ounce': 0.03527}, 'plural': '+s', 'abbrs': 'g'},
    'hectare': {'conversions': {'mile^2': 0.003861, 'kilometer^2': 0.01}, 'plural': '+s', 'abbrs': 'hect'},
    'hex': {'plural': null, 'abbrs': null},
    'inch': {'conversions': {'millimeter': 25.4}, 'plural': '+es', 'abbrs': 'in'},
    'inch^2': {'conversions': {'millimeter^2': 645.16}, 'plural': '+es', 'abbrs': 'in2'},
    'inch^3': {
        'conversions': {'pint': 0.0347, 'centiliter': 1.639},
        'plural': '+es',
        'abbrs': 'in3'
    },
    'int': {
        'conversions': [
            ['hex', annotate(i => '0x' + i.toString(16), 'HEX')],
            ['exp', annotate(i => i.toExponential(), 'EXP')]
        ],
        'plural': null,
        'abbrs': null
    },
    'beer keg': {'conversions': {'cases': 6.8889, 'gallon': 15.5, 'beers': 165.333}, 'plural': '+s', 'abbrs': null},
    'kilogram': {'conversions': {'pound': 2.205}, 'plural': '+s', 'abbrs': 'kg'},
    'kilometer': {'conversions': {'mile': 0.6214}, 'plural': '+s', 'abbrs': 'k,km'},
    'kilometer^2': {
        'conversions': {'mile^2': 0.3861},
        'plural': '+s',
        'abbrs': 'km2'
    },
    'kilometers/hour': {'conversions': {}, 'plural': null, 'abbrs': 'kph'},
    'knot': {'conversions': {'mph': 1.151, 'kph': 1.852}, 'plural': '+s', 'abbrs': 'kn'},
    'league': {
        'conversions': {'mile': 3, 'kilometer': 1.8642},
        'plural': '+s',
        'abbrs': 'lg'
    },
    'liter': {'conversions': {'pint': 2.1133}, 'plural': '+s', 'abbrs': 'l'},
    'meter': {'conversions': {'yard': 1.094}, 'plural': '+s', 'abbrs': 'm'},
    'meter^2': {'conversions': {'yard^2': 1.196}, 'plural': '+s', 'abbrs': 'm2'},
    'meter^3': {'conversions': {'yard^3': 1.308}, 'plural': '+s', 'abbrs': 'm3'},
    'mile': {'conversions': {'furlong': 8, 'nautical mile': 0.86897}, 'plural': '+s', 'abbrs': 'mi'},
    'mile^2': {'conversions': {'acre': 640}, 'plural': '+s', 'abbrs': 'mi2'},
    'milligram': {'plural': '+s', 'abbrs': 'mg'},
    'milliliter': {'plural': '+s', 'abbrs': 'ml'},
    'millimeter': {'plural': '+s', 'abbrs': 'mm'},
    'millimeter^2': {'plural': '+s', 'abbrs': 'mm2'},
    'miles/hour': {'conversions': {'kilometers/hour': 1.6093}, 'plural': null, 'abbrs': 'mph'},
    'ounce': {'plural': '+s', 'abbrs': 'oz'},
    'pint': {'conversions': {'fluid ounce': 16}, 'plural': '+s', 'abbrs': 'pt,pts'},
    'pound': {'plural': '+s', 'abbrs': 'lb,lbs'},
    'pound/in^2': {'plural': 'pounds/in^2', abbrs: 'psi'},
    'quart': {'conversions': {'liter': 0.9463}, 'plural': '+s', 'abbrs': 'qt,qts'},
    'rod': {'conversions': {'yard': 5.5}, 'plural': '+s', 'abbrs': null},
    'stone': {'conversions': {'pound': 14, 'kilogram': 6.35}, 'plural': '+s', 'abbrs': 'st'},
    'tablespoon': {
        'conversions': {'milliliter': 15, 'teaspoon': 3},
        'plural': '+s',
        'abbrs': 'tb,tbl,tbs'
    },
    'teaspoon': {'conversions': {'milliliter': 5}, 'plural': '+s', 'abbrs': 'tsp,tsps'},
    'yard': {'plural': '+s', 'abbrs': 'yd,yds'},
    'yard^2': {'conversions': {'foot^2': 9}, 'plural': '+s', 'abbrs': 'yd2,yds2'},
    'yard^3': {'plural': '+s', 'abbrs': 'yd3,yds3'}
};

export const unitsOfMeasure = new UnitsOfMeasure(initialFormulas);

export const DEFAULT_CONF = {
    handler: defaultConversionHandler,

    resultsGroupClass: 'list-group',
    resultsItemClass: 'list-group-item',
    resultsContainer: '#convert-results',

    helpElement: false,
    helpTableClass: 'table table-striped'
};

export const nlConvert = function(conversionInput, resultsElement, userOptions) {
    const options = {...DEFAULT_CONF, ...(userOptions || {})};
    let convInputEl = document.querySelector(conversionInput);
    if(options.helpElement) {
        buildHelp(options.helpElement, unitsOfMeasure, options);
    }

    convInputEl.addEventListener('input', function(e) {
        const value = e.target.value;
        const expr = parser.parse(value);
        let result = null;
        if(expr && expr.label) {
            result = unitsOfMeasure.convert(expr.value, expr.label);
        };
        resultsElement = document.querySelector(resultsElement);
        options.handler(resultsElement, result, options);
    }, false);

    if(convInputEl.value) {
        convInputEl.dispatchEvent(new Event('input'));   
    }
};
