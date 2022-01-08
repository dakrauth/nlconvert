"use strict";

// simple helper functions
const swapCaret = text => text ? text.toString().replace(/\^(\d)/, '&sup$1;') : '';
const isNumber = o => typeof o === 'number';
const isString = o => typeof o ==='string';
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

const formatNumber = function(obj) {
    if(parseFloat(obj) === 0) {
        return '0';
    }

    let bits = obj.toFixed(4).split('.');
    bits[0] = parseInt(bits[0]).toLocaleString()
    bits[1] = bits[1].replace(/0+$/, '');
    return bits[1] ? bits.join('.') : bits[0];
};

// tokens for simple recursive decent parser
const tokenPatterns = [
    // whitespace
    ['ws', null, /^\s+/],

    // floating point number
    ['float', parseFloat, /^(\d+\.\d*|\.\d+)([eE][-+]?\d+)?|\d+[eE][-+]?\d+/],

    // decimal integer
    ['dec', parseInt, /^(0|[1-9]\d*)/],

    // hex integer
    ['hex', i => parseInt(i, 16), /^0[xX][\da-fA-F]*/],

    // operator
    ['op', s => s, /^(\(|\)|\+|-|\*\*|\*|\^|\/)/],

    // identifier
    ['id', s => s, /^[a-zA-Z][a-zA-Z_]+/]
];

export function tokenScanner(code) {
    let tokens = [];
    while(code) {
        let found = false;
        for(const [name, f, regex] of tokenPatterns) {
            const m = code.match(regex);
            if(m) {
                // console.table([{matchName: name, matchValue: m[0], length: m[0].length, code: code}]);
                if(m.length === 0) {
                    throw "unexpected non-token";
                }
                if(f) {
                    tokens.push({value: f(m[0]), name: name});
                }
                found = true;
                code = code.substr(m[0].length); 
                break;
            }
        }
        if(!found) {
            throw `Bad expression at ${code}`
        }
    }
    return tokens;
}

// very simple math expression interpreter
export class Interpreter {
    constructor(namespace, functions) {
        this.namespace = {pi: Math.pi, e: Math.e, ...(namespace || {})};
        this.function = {
            sqrt: Math.sqrt,
            ...(functions || {})
        };
    }
    factor(source) {
        let tok = source.shift();
        if(tok.value === '-') {
            return -this.factor(source);
        }
        if(tok.name === 'dec' || tok.name === 'hex' || tok.name === 'float') {
            return tok.value;
        }
        if(this.function[tok.value]) {
            const func = this.function[tok.value];
            return func(this.expression(source));
        }
        if(tok.value === '(') {
            let o = this.expression(source);
            tok = source.shift();
            if(tok.value !== ')') {
                throw "missing close paren token";
            }
            return o;
        }
        if(tok.value in this.namespace) {
            return this.namespace[tok.value];
        }

        throw `Invalid token ${tok.value}, ${tok.name}`;
    }
    exponential(source) {
        const o = this.factor(source);
        if(!source.length) {
            return o;
        }

        const tok = source.shift()
        if(tok.value === '**' || tok.value === '^') { 
            return o ** this.exponential(source);
        }

        source.unshift(tok);
        return o;
    }
    multiplicative(source) {
        const o = this.exponential(source);
        if(!source.length) {
            return o;
        }

        const tok = source.shift();
        if(tok.value === '*') { 
            return o * this.multiplicative(source);
        }
        if(tok.value === '/') { 
            return o / this.multiplicative(source);
        }
        if(tok.value === '%') { 
            return o % this.multiplicative(source);
        }

        source.unshift(tok);
        return o;
    }
    expression(source) {
        const o = this.multiplicative(source);
        if(!source.length) {
            return o;
        }

        const tok = source.shift();
        if(tok.value === '+') {
            return o + this.expression(source);
        }
        if(tok.value === '-') {
            return o - this.expression(source);
        }

        source.unshift(tok);
        return o;
    }
    evaluate(code) {
        if(isString(code)) {
            code = tokenScanner(code);
        }
        return this.expression(code);
    }
    getRunner(code) {
        if(isString(code)) {
            code = tokenScanner(code);
        }
        return value => {
            let codeCopy = [...code];
            this.namespace['value'] = value;
            return this.expression(codeCopy);
        }
    }
}

let unitId = 0;

export class Unit { 
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
        if(isNumber(value)) {
            this.func = multiplier(value); 
        }
        else if(isString(value)) {
            this.func = new Interpreter().getRunner(value);
        }
        else {
            this.func = value;
        }
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
        if(isString(value)) {
            return value;
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
        let pendingConversions = [];
        for(const [key, attrs] of Object.entries(units)) {
            let unit = this.addUnit(key, attrs.plural, attrs.abbrs);
            if(attrs.conversions) {
                unit.conversions = attrs.conversions;
                pendingConversions.push([unit, attrs.conversions]);
            }
        }
        for(const [fromUnit, conversions] of pendingConversions) {
            for(const [toUnitName, conversionValue] of Object.entries(conversions)) {
                this.addConverter(fromUnit, toUnitName, conversionValue)
            }
        }
    }
    getOrCreateConversions(name) {
        if(!has(this.unitConversions, name)) {
            this.unitConversions[name] = {};
        }
        return this.unitConversions[name];
    }
    addConverter(fromUnit, toUnit, value) {
        if(isString(fromUnit)) {
            fromUnit = this.unit(fromUnit);
        }
        if(isString(toUnit)) {
            const toUnitName = toUnit;
            toUnit = this.unit(toUnit);
            if(!toUnit) {
                toUnit = this.addUnit(toUnitName, toUnitName);
            }
        }
        const converter = new Converter(fromUnit, toUnit, value);
        this.getOrCreateConversions(fromUnit.name)[toUnit.name] = converter;
        if(!has(toUnit.conversions, fromUnit.name) && isNumber(value)) {
            this.getOrCreateConversions(toUnit.name)[fromUnit.name] = converter.invert();
        }
    }
    addUnit(unitName, plural, abbrs) {
        let unit = this.set(unitName, new Unit(unitName, plural, abbrs));
        for(const abbr of unit.abbrs) {
            this.set(abbr, unit);
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
    set(label, unit) {
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
                try {
                    matrix.push({
                        name: swapCaret(unit.name),
                        abbrs: unit.abbrs ? unit.abbrs.join(", ") : "",
                        toUnit: swapCaret(conv.toUnit.name),
                        value: conv.valueRepr()
                    });
                } catch(e) {
                    console.error(e);
                }
            }
        }
        return matrix;
    }
}

export const nlParser = {
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
            match = nlParser.fracRe.exec(text);
            if(!match) {
                console.log('parseFraction fail:', text)
            }
        }
        if(match[2]) {
            value = parseInt(match[2]);
        }
        value += parseInt(match[3]) / parseInt(match[4]);
        let label = text.substr(match[0].length).trim();
        return nlParser.expression(
            match[1] === '-' ? -value : value,
            label || 'fraction',
            text
        );
    },
    parse: function(text) {
        let label = '';
        let value = false;
        let match = nlParser.fracRe.exec(text);
            
        if(match) {
            return nlParser.parseFraction(text, match)
        }

        match = nlParser.numRe.exec(text);
        if(match) {
            value = parseFloat(match[0]);
        }
        else {
            console.log('nlParser.parse fail:', text);
        }

        if(match) {
            label = text.substr(match[0].length).trim().toLowerCase() || 'number';
        }
        return value ? nlParser.expression(value, label, text) : null;
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
        'conversions': {'fahrenheit': 'value * 9/5 + 32'},
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
        'conversions': {'celsius': '(value - 32) * 5/9'},
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

    helpElement: false,
    helpTableClass: 'table table-striped'
};

export const nlConvert = function(conversionInput, resultsElement, userOptions) {
    const options = {...DEFAULT_CONF, ...(userOptions || {})};
    let convInputEl = document.querySelector(conversionInput);
    if(options.helpElement) {
        buildHelp(options.helpElement, unitsOfMeasure, options);
    }

    resultsElement = isString(resultsElement)
                   ? document.querySelector(resultsElement)
                   : resultsElement;

    convInputEl.addEventListener('input', function(e) {
        const value = e.target.value;
        const expr = nlParser.parse(value);
        let result = null;
        if(expr && expr.label) {
            result = unitsOfMeasure.convert(expr.value, expr.label);
        };
        options.handler(resultsElement, result, options);
    }, false);

    if(convInputEl.value) {
        convInputEl.dispatchEvent(new Event('input'));   
    }
};
