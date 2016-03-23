const AND = 'and';
const OR = 'or';

/**
 * The comparison field lambda expression
 * @example
 * f()
 *  .eq(x => x.toLower('Name'), 'a')
 *  .toString(); 
 * // tolower(Name) eq 'a'
 * @callback ODataFilterBuilder~fieldLambdaExpression
 * @param {ODataFilterBuilder.functions} - Filter canonical functions (toLower, substring, ...)
 * @returns  {string}
 */

/**
 * The comparison rule lambda expression
 * @example
 * f()
 *  .and(x => x.eq('Type/Id', 1))
 *  .and(x => x.contains('Name', 'a'))
 *  .toString();
 * // (Type/Id eq 1) and (contains(Name, 'a'))
 * @callback ODataFilterBuilder~ruleLambdaExpression
 * @param {ODataFilterBuilder} - A new instance of {@link ODataFilterBuilder}
 * @returns  {ODataFilterBuilder}
 */

/**
 * The comparison input rule
 * @typedef {string|ODataFilterBuilder|ODataFilterBuilder~ruleLambdaExpression} ODataFilterBuilder~InputRule
 * @example
 * f().and(inputRule)
 * // string
 * f().and('Id eq 1');
 * // ODataFilterBuilder
 * f().and(f().eq('Id', 1));
 * // ruleLambdaExpression
 * f().and(x => x.eq('Id', 1));
 */

/**
 * The comparison input field
 * @typedef {string|ODataFilterBuilder~fieldLambdaExpression} ODataFilterBuilder~InputField
 * @example
 * f().contains(inputField, 'a')
 *
 * // string
 * f().contains('tolower(Name)', 'a');
 * // fieldLambdaExpression
 * f().contains(x => x.toLower('Name', ''), 'a');
 *
 * // returns 'contains(tolower(Name), 'a')
 */

/**
 * The {@link ODataFilterBuilder} source rule object.
 * @typedef {Object} ODataFilterBuilder~Source
 * @property {string} condition - A base condition ('and' OR 'or').
 * @property {Array.<ODataFilterBuilder~Source|string>} rules - Child rules related to base condition
 */

/**
 * Reduce source with new rule and/or condition
 * @param {ODataFilterBuilder~Source} source - Source rule
 * @param {Object|string} rule - Rule to add
 * @param {string} [condition] - Condition for rule to add(and/or)
 * @returns {Object} updated rule
 * @private
 */
function _add(source, rule, condition) {
  if (rule) {
    if (condition && source.condition !== condition) {
      // if source rules condition different from rule condition
      // update source condition

      source = {
        condition: condition,
        // if has more then one rules
        // regroup source rules tree
        rules: source.rules.length > 1 ? [source] : source.rules
      };
    }

    // add new rule
    source.rules.push(rule);
  }
  return source;
}

function _normilise(value) {
  return typeof value === 'string' ? `'${value}'` : value;
}

/**
 * Negate rule
 * @param {ODataFilterBuilder~InputRule} rule - Rule to negate
 * @private
 * @returns {string} negated rule
 */
function _not(rule) {
  const ruleString = _inputRuleToString(rule);
  if (ruleString) {
    return `not (${ruleString})`;
  }
}

/**
 * @param {string} functionName - Function name
 * @param {ODataFilterBuilder~InputField} field - Field to handle by function
 * @param {Array|string|number} [values] - Zero or more function values
 * @param {boolean} [normaliseValues=true] - Convert string "value" to "'value'" or not. (Convert by default)
 * @returns {string} function string
 * @private
 */
function _function(functionName, field, values, normaliseValues = true) {
  // make sure that field is string
  field = _inputFieldToString(field);

  if (typeof values === 'undefined') {
    values = [];
  } else if (!Array.isArray(values)) {
    values = [values];
  }

  if (values.length === 0) {
    return `${functionName}(${field})`;
  }

  if (normaliseValues) {
    values = values.map(_normilise);
  }

  return `${functionName}(${field}, ${values.join(', ')})`;
}

/**
 * @param {ODataFilterBuilder~InputField} field - Field to compare
 * @param {string} operator - Comparison operator
 * @param {string|number|*} value - Value to compare with field
 * @param {boolean} [normaliseValue=true] - Convert string "value" to "'value'" or not. (Convert by default)
 * @returns {string} The comparison string
 * @private
 */
function _compare(field, operator, value, normaliseValue = true) {
  // make sure that field is string
  field = _inputFieldToString(field);

  if (normaliseValue) {
    value = _normilise(value);
  }

  return `${field} ${operator} ${value}`;
}

/**
 * @param {ODataFilterBuilder~InputField} field - Field to compare
 * @param {string} operator - Comparison operator
 * @param {Array} values - Values to compare with field
 * @param {boolean} [normaliseValues=true] - Convert string "value" to "'value'" or not. (Convert by default)
 * @returns {string[]} An array of comparison strings
 * @private
 */
function _compareMap(field, operator, values, normaliseValues = true) {
  if (!values) {
    return [];
  }

  // make sure that field is string
  field = _inputFieldToString(field);

  if (!Array.isArray(values)) {
    return [_compare(field, operator, values, normaliseValues)];
  }

  return values.map(value => _compare(field, operator, value, normaliseValues));
}

function _joinRules(rules, condition) {
  return rules.join(` ${condition} `);
}

/**
 * Convert source rule to string
 * @param {ODataFilterBuilder~Source|string} rule - A source rule
 * @param {boolean} [wrapInParenthesis=false] - Wrap result string in Parenthesis or not.
 * @returns {string} - A source string
 * @private
 */
function _sourceRuleToString(rule, wrapInParenthesis = false) {
  if (typeof rule !== 'string') {
    // if child rules more then one join child rules by condition
    // and wrap in brackets every child rule
    rule = (
        rule.rules.length === 1
            ? _sourceRuleToString(rule.rules[0])
            : _joinRules(rule.rules.map(r => _sourceRuleToString(r, true)), rule.condition)
    );
  }

  return wrapInParenthesis ? `(${rule})` : rule;
}

/**
 * Convert input rule to string
 * @param {ODataFilterBuilder~InputRule} rule - An input rule
 * @returns {string} - An input rule string
 * @private
 */
function _inputRuleToString(rule) {
  if (typeof rule === 'function') {
    rule = rule(new ODataFilterBuilder());
  }

  return rule && rule.toString();
}

/**
 * Convert input field to string if field is lambda expression
 * @example
 * _inputFieldToString(x => x.toLower('Name'));
 * _inputFieldToString('tolower(Name)');
 * // returns 'tolower(Name)'
 * @param {ODataFilterBuilder~InputField} field - An input field
 * @returns {string} An input field string
 * @private
 */
function _inputFieldToString(field) {
  return typeof field === 'function' ? field(ODataFilterBuilder.functions) : field;
}

/**
 * Creates a new {@link ODataFilterBuilder} instance.
 * Can be used without "new" operator.
 * @class
 * @classDesc ODataFilterBuilder is util to build
 * {@link http://docs.oasis-open.org/odata/odata/v4.0/errata02/os/complete/part2-url-conventions/odata-v4.0-errata02-os-part2-url-conventions-complete.html#_Toc406398094|$filter part}
 * for OData query options.
 *
 * @see {@link http://docs.oasis-open.org/odata/odata/v4.0/errata02/os/complete/part2-url-conventions/odata-v4.0-errata02-os-part2-url-conventions-complete.html|OData URL Conventions}
 * for further information.
 *
 * @example
 * // use short name as alias
 * const f = ODataFilterBuilder;
 *
 * @example
 * // can be used without "new" operator
 * // default base condition is 'and'
 * f()
 *  .eq('TypeId', '1')
 *  .eq('SubType/Id', '1')
 *  .toString();
 * // returns `(TypeId eq '1') and (SubType/Id eq 1)`
 *
 * @example
 * // 'or' condition as base condition
 * f('or')
 *  .eq('TypeId', '1')
 *  .eq('SubType/Id', '1')
 *  .toString();
 * // returns `(TypeId eq '1') or (SubType/Id eq 1)`
 *
 * @param {string} [condition='and'] - base condition ('and' OR 'or').
 * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance.
 */
function ODataFilterBuilder(condition = AND) {
  if (!(this instanceof ODataFilterBuilder)) {
    return new ODataFilterBuilder(condition);
  }

  this.condition = condition;
  this.source = {
    condition: condition,
    rules: []
  };
}

/**
 * Creates new {@link ODataFilterBuilder} instance with 'and' as base condition
 * @example
 * f.and()
 *  .eq('a', 1)
 *  .eq('b', 2)
 *  .toString();
 * // (a eq 1) and (b eq 2)
 * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance with 'and' as base condition
 */
ODataFilterBuilder.and = () => new ODataFilterBuilder(AND);

/**
 * Create new {@link ODataFilterBuilder} with 'or' as base condition
 * @example
 * f.or()
 *  .eq('a', 1)
 *  .eq('b', 2)
 *  .toString();
 * // (a eq 1) or (b eq 2)
 * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance with 'or' as base condition
 */
ODataFilterBuilder.or = () => new ODataFilterBuilder(OR);

/**
 * Canonical Functions
 * @memberof ODataFilterBuilder
 * @namespace ODataFilterBuilder.functions
 * @type {ODataFilterBuilder.functions}
 */
ODataFilterBuilder.functions = {
  /**
   * The length function returns the number of characters in the parameter value.
   * @example
   * f().eq(x => x.length('CompanyName'), 19)
   * // length(CompanyName) eq 19
   * @param {ODataFilterBuilder~InputField} field - Field
   * @returns {string} A function string
   */
  length(field) {
    return _function('length', field);
  },

  /**
   * The tolower function returns the input parameter string value with all uppercase characters converted to lowercase.
   * @example
   * f().eq(x => x.toLower('CompanyName'), 'alfreds futterkiste')
   * // tolower(CompanyName) eq 'alfreds futterkiste'
   * @param {ODataFilterBuilder~InputField} field - Field
   * @returns {string} A function string
   */
  toLower(field) {
    return _function('tolower', field);
  },

  /**
   * The toupper function returns the input parameter string value with all lowercase characters converted to uppercase.
   * @example
   * f().eq(x => x.toUpper('CompanyName'), 'ALFREDS FUTTERKISTE')
   * // toupper(CompanyName) eq 'ALFREDS FUTTERKISTE'
   * @param {ODataFilterBuilder~InputField} field - Field
   * @returns {string} A function string
   */
  toUpper(field) {
    return _function('toupper', field);
  },

  /**
   * The trim function returns the input parameter string value with all leading and trailing whitespace characters, removed.
   * @example
   * f().eq(x => x.trim('CompanyName'), 'CompanyName')
   * // trim(CompanyName) eq CompanyName
   * @param {ODataFilterBuilder~InputField} field - Field
   * @returns {string} A function string
   */
  trim(field) {
    return _function('trim', field);
  },

  /**
   * The indexof function returns the zero-based character position of the first occurrence of the second parameter value in the first parameter value.
   * @example
   * f().eq(f.functions.indexOf('CompanyName', 'lfreds'), 1)
   * f().eq(x => x.indexOf('CompanyName', 'lfreds'), 1)
   * // indexof(CompanyName,'lfreds') eq 1
   *
   * @param {ODataFilterBuilder~InputField} field - The first function parameter
   * @param {string} value - The second function parameter
   *
   * @returns {string} A function string
   */
  indexOf(field, value) {
    return _function('indexof', field, [value]);
  },

  /**
   * @example
   * f().eq(f.functions.substring('CompanyName', 1), 'lfreds Futterkiste');
   * f().eq(x => x.substring('CompanyName', 1), 'lfreds Futterkiste');
   * // substring(CompanyName, 1) eq 'lfreds Futterkiste'
   *
   * @example
   * f().eq(x => x.substring('CompanyName', 1, 2), 'lf').toString();
   * f().eq(f.functions.substring('CompanyName', 1, 2), 'lf')
   * // substring(CompanyName, 1, 2) eq 'lf'
   *
   * @param {ODataFilterBuilder~InputField} field - The first function parameter
   * @param {...number} values - Second or second and third function parameters
   *
   * @returns {string} A function string
   */
  substring(field, ...values) {
    return _function('substring', field, values);
  },

  /**
   * @param {ODataFilterBuilder~InputField} field - The first function parameter
   * @param {string} value - The second function parameter
   * @param {boolean} [normaliseValue=true] - Convert string "value" to "'value'" or not. (Convert by default)
   * @example
   * f().eq(x => x.concat(y => y.concat('City',', '), 'Country', false), 'Berlin, Germany');
   * // concat(concat(City, ', '), 'Country') eq 'Berlin, Germany'
   * @returns {string} A function string
   */
  concat(field, value, normaliseValue) {
    return _function('concat', field, [value], normaliseValue);
  }
};

ODataFilterBuilder.prototype = {
  constructor: ODataFilterBuilder,

  /**
   * The 'add' method adds new filter rule with AND or OR condition
   * if condition not provided. Source condition is used (AND by default)
   * @this {ODataFilterBuilder}
   * @param {ODataFilterBuilder~InputRule} rule - Rule to add
   * @param {string} [condition] - Condition for rule to add(and/or)
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   * @private
   */
  _add(rule, condition = this.condition) {
    // NOTE: if condition not provider, source condition uses
    this.source = _add(this.source, _inputRuleToString(rule), condition);
    return this;
  },

  /*
   * Logical Operators
   */

  /**
   * Logical And
   * @param {ODataFilterBuilder~InputRule} rule - Rule to add
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */
  and(rule) {
    return this._add(rule, AND);
  },

  /**
   * Logical Or
   * @param {ODataFilterBuilder~InputRule} rule - Rule to add
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */
  or(rule) {
    return this._add(rule, OR);
  },

  /**
   * Logical Negation
   * @param {ODataFilterBuilder~InputRule} rule - Rule to add
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */
  not(rule) {
    return this._add(_not(rule));
  },

  /**
   * Logical compare field and value by operator
   * @param {ODataFilterBuilder~InputField} field - Field to compare
   * @param {string} operator - Comparison operator
   * @param {string|number|*} value - A value to compare with
   * @param {boolean} [normaliseValue=true] - Convert string "value" to "'value'" or not. (Convert by default)
   * @private
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */
  _compare(field, operator, value, normaliseValue) {
    return this._add(_compare(field, operator, value, normaliseValue));
  },

  /**
   * Equal
   * @param {ODataFilterBuilder~InputField} field - Field to compare
   * @param {string|number|*} value - A value to compare with
   * @param {boolean} [normaliseValue=true] - Convert string "value" to "'value'" or not. (Convert by default)
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */
  eq(field, value, normaliseValue) {
    return this._compare(field, 'eq', value, normaliseValue);
  },

  /**
   * Not Equal
   * @param {ODataFilterBuilder~InputField} field - Field to compare
   * @param {string|number|*} value - A value to compare with
   * @param {boolean} [normaliseValue=true] - Convert string "value" to "'value'" or not. (Convert by default)
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */
  ne(field, value, normaliseValue) {
    return this._compare(field, 'ne', value, normaliseValue);
  },

  /**
   * Greater Than
   * @param {ODataFilterBuilder~InputField} field - Field to compare
   * @param {string|number|*} value - A value to compare with
   * @param {boolean} [normaliseValue=true] - Convert string "value" to "'value'" or not. (Convert by default)
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */
  gt(field, value, normaliseValue) {
    return this._compare(field, 'gt', value, normaliseValue);
  },

  /**
   * Greater than or Equal
   * @param {ODataFilterBuilder~InputField} field - Field to compare
   * @param {string|number|*} value - A value to compare with
   * @param {boolean} [normaliseValue=true] - Convert string "value" to "'value'" or not. (Convert by default)
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */
  ge(field, value, normaliseValue) {
    return this._compare(field, 'ge', value, normaliseValue);
  },

  /**
   * Less Than
   * @param {ODataFilterBuilder~InputField} field - Field to compare
   * @param {string|number|*} value - A value to compare with
   * @param {boolean} [normaliseValue=true] - Convert string "value" to "'value'" or not. (Convert by default)
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */
  lt(field, value, normaliseValue) {
    return this._compare(field, 'lt', value, normaliseValue);
  },

  /**
   * Less than or Equal
   * @param {ODataFilterBuilder~InputField} field - Field to compare
   * @param {string|number|*} value - A value to compare with
   * @param {boolean} [normaliseValue=true] - Convert string "value" to "'value'" or not. (Convert by default)
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */
  le(field, value, normaliseValue) {
    return this._compare(field, 'le', value, normaliseValue);
  },

  /**
   * @param {ODataFilterBuilder~InputField} field - Field to compare
   * @param {string[]|string} values - Values to compare with
   * @param {boolean} [normaliseValues=true] - Convert string "value" to "'value'" or not. (Convert by default)
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */
  in(field, values, normaliseValues) {
    return this._add(_joinRules(_compareMap(field, 'eq', values, normaliseValues), OR));
  },

  /**
   * @param {ODataFilterBuilder~InputField} field - Field to compare
   * @param {Array} values - Values to compare with
   * @param {boolean} [normaliseValues=true] - Convert string "value" to "'value'" or not. (Convert by default)
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */
  notIn(field, values, normaliseValues) {
    return this.not(rule => rule.in(field, values, normaliseValues));
  },

  // Canonical Functions

  /**
   * The contains function returns true if the second parameter string value is a substring of the first parameter string value.
   * @example
   * // return contains(CompanyName, 'Alfreds')
   * @param {ODataFilterBuilder~InputField} field - Field to compare
   * @param {string} value - Value to compare
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */
  contains(field, value) {
    return this._add(_function('contains', field, value));
  },

  /**
   * The startswith function returns true if the first parameter string value starts with the second parameter string value.
   * @example
   * // return startswith(CompanyName,'Alfr')
   * @param {ODataFilterBuilder~InputField} field - Field to compare
   * @param {string} value - Value to compare
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */
  startsWith(field, value) {
    return this._add(_function('startswith', field, value));
  },

  /**
   * The endswith function returns true if the first parameter string value ends with the second parameter string value.
   * @example
   * // return endswith(CompanyName,'Futterkiste')
   * @param {ODataFilterBuilder~InputField} field - Field to compare
   * @param {string} value - Value to compare
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */
  endsWith(field, value) {
    return this._add(_function('endswith', field, value));
  },

  /**
   * Convert filter builder instance to string
   * @this {ODataFilterBuilder}
   * @returns {string} A source string representation
   */
  toString() {
    //return source;
    return _sourceRuleToString(this.source);
  }
};

export default ODataFilterBuilder;