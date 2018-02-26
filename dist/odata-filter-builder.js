(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.ODataFilterBuilder = factory());
}(this, (function () { 'use strict';

/**
 * Reduce source with new rule and/or condition
 * @param {Object} source - Source rule
 * @param {Object|string} rule - Rule to add
 * @param {string} [condition] - Condition for rule to add(and/or)
 * @returns {Object} updated rule
 * @private
 */
function reduceSourceWithRule(source, rule, condition) {
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
    } // add new rule


    source.rules.push(rule);
  }

  return source;
}

function inputRuleToString(rule) {
  if (typeof rule === 'function') {
    rule = rule(new ODataFilterBuilder());
  }

  return rule && rule.toString();
}

function joinRulesWithCondition(rules, condition) {
  return rules.map(function (r) {
    return sourceRuleToString(r, true);
  }).join(" " + condition + " ");
}

function sourceRuleToString(rule, wrapInParenthesis) {
  if (wrapInParenthesis === void 0) {
    wrapInParenthesis = false;
  }

  if (typeof rule !== 'string') {
    // if child rules more then one join child rules by condition
    // and wrap in brackets every child rule
    rule = rule.rules.length === 1 ? sourceRuleToString(rule.rules[0]) : joinRulesWithCondition(rule.rules, rule.condition);
  }

  return wrapInParenthesis ? "(" + rule + ")" : rule;
}

function inputFieldToString(field) {
  return typeof field === 'function' ? field(canonicalFunctions) : field;
}

function isString(value) {
  return typeof value === 'string';
}

function isDate(value) {
  return typeof value === 'object' && Object.prototype.toString.call(value) === '[object Date]';
}

function normaliseValue(value) {
  if (isString(value)) {
    return "'" + value + "'";
  }

  if (isDate(value)) {
    return value.toISOString();
  }

  return value;
}

function canonicalFunction(functionName, field, values, normaliseValues, reverse) {
  if (normaliseValues === void 0) {
    normaliseValues = true;
  }

  if (reverse === void 0) {
    reverse = false;
  }

  // make sure that field is string
  field = inputFieldToString(field);

  if (typeof values === 'undefined') {
    values = [];
  } else if (!Array.isArray(values)) {
    values = [values];
  }

  if (values.length === 0) {
    return functionName + "(" + field + ")";
  }

  if (normaliseValues) {
    values = values.map(normaliseValue);
  }

  var functionArgs = !reverse ? [field].concat(values) : values.concat([field]);
  return functionName + "(" + functionArgs.join(', ') + ")";
}

function contains(field, value) {
  return canonicalFunction('contains', field, value);
}

function startsWith(field, value) {
  return canonicalFunction('startswith', field, value);
}

function endsWith(field, value) {
  return canonicalFunction('endswith', field, value);
}
/**
 * The tolower function returns the input parameter string value with all uppercase characters converted to lowercase.
 * @example
 * f().eq(x => x.toLower('CompanyName'), 'alfreds futterkiste')
 * // tolower(CompanyName) eq 'alfreds futterkiste'
 * @param {string|InputFieldExpression} field - Field
 * @returns {string} A function string
 */


function toLower(field) {
  return canonicalFunction('tolower', field);
}
/**
 * The toupper function returns the input parameter string value with all lowercase characters converted to uppercase.
 * @example
 * f().eq(x => x.toUpper('CompanyName'), 'ALFREDS FUTTERKISTE')
 * // toupper(CompanyName) eq 'ALFREDS FUTTERKISTE'
 * @param {string|InputFieldExpression} field - Field
 * @returns {string} A function string
 */


function toUpper(field) {
  return canonicalFunction('toupper', field);
}
/**
 * The trim function returns the input parameter string value with all leading and trailing whitespace characters, removed.
 * @example
 * f().eq(x => x.trim('CompanyName'), 'CompanyName')
 * // trim(CompanyName) eq CompanyName
 * @param {string|InputFieldExpression} field - Field
 * @returns {string} A function string
 */


function trim(field) {
  return canonicalFunction('trim', field);
}
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
 * @param {string|InputFieldExpression} field - The first function parameter
 * @param {...number} values - Second or second and third function parameters
 *
 * @returns {string} A function string
 */


function substring(field) {
  for (var _len = arguments.length, values = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    values[_key - 1] = arguments[_key];
  }

  return canonicalFunction('substring', field, values);
}
/**
 * @param {string|InputFieldExpression} field - The first function parameter
 * @param {string} value - The second function parameter
 * @param {boolean} [normaliseValue=true] - Convert string "value" to "'value'" or not. (Convert by default)
 * @example
 * f().eq(x => x.concat(y => y.concat('City',', '), 'Country', false), 'Berlin, Germany');
 * // concat(concat(City, ', '), 'Country') eq 'Berlin, Germany'
 * @returns {string} A function string
 */


function concat(field, value, normaliseValue$$1) {
  return canonicalFunction('concat', field, [value], normaliseValue$$1);
}
/**
 * The length function returns the number of characters in the parameter value.
 * @example
 * f().eq(x => x.length('CompanyName'), 19)
 * // length(CompanyName) eq 19
 * @param {string|InputFieldExpression} field - Field
 * @returns {string} A function string
 */


function length(field) {
  return canonicalFunction('length', field);
}
/**
 * The indexof function returns the zero-based character position of the first occurrence of the second parameter value in the first parameter value.
 * @example
 * f().eq(f.functions.indexOf('CompanyName', 'lfreds'), 1)
 * f().eq(x => x.indexOf('CompanyName', 'lfreds'), 1)
 * // indexof(CompanyName,'lfreds') eq 1
 *
 * @param {string|InputFieldExpression} field - The first function parameter
 * @param {string} value - The second function parameter
 *
 * @returns {string} A function string
 */


function indexOf(field, value) {
  return canonicalFunction('indexof', field, [value]);
}



var canonicalFunctions = Object.freeze({
	canonicalFunction: canonicalFunction,
	contains: contains,
	startsWith: startsWith,
	endsWith: endsWith,
	toLower: toLower,
	toUpper: toUpper,
	trim: trim,
	substring: substring,
	concat: concat,
	length: length,
	indexOf: indexOf
});

function not(rule) {
  var ruleString = inputRuleToString(rule);

  if (ruleString) {
    return "not (" + ruleString + ")";
  }
}

function compare(field, operator, value, normaliseValue$$1) {
  if (normaliseValue$$1 === void 0) {
    normaliseValue$$1 = true;
  }

  // make sure that field is string
  field = inputFieldToString(field);

  if (normaliseValue$$1) {
    value = normaliseValue(value);
  }

  return field + " " + operator + " " + value;
}

function compareMap(field, operator, values, normaliseValues) {
  if (normaliseValues === void 0) {
    normaliseValues = true;
  }

  if (!values) {
    return [];
  } // make sure that field is string


  field = inputFieldToString(field);

  if (!Array.isArray(values)) {
    return [compare(field, operator, values, normaliseValues)];
  }

  return values.map(function (value) {
    return compare(field, operator, value, normaliseValues);
  });
}

function eq(field, value, normaliseValue$$1) {
  return compare(field, 'eq', value, normaliseValue$$1);
}

function ne(field, value, normaliseValue$$1) {
  return compare(field, 'ne', value, normaliseValue$$1);
}

function gt(field, value, normaliseValue$$1) {
  return compare(field, 'gt', value, normaliseValue$$1);
}

function ge(field, value, normaliseValue$$1) {
  return compare(field, 'ge', value, normaliseValue$$1);
}

function lt(field, value, normaliseValue$$1) {
  return compare(field, 'lt', value, normaliseValue$$1);
}

function le(field, value, normaliseValue$$1) {
  return compare(field, 'le', value, normaliseValue$$1);
}

function joinRules(rules, condition) {
  return rules.join(" " + condition + " ");
}

function compareIn(field, values, normaliseValues) {
  return joinRules(compareMap(field, 'eq', values, normaliseValues), 'or');
}

function compareNotIn(field, values, normaliseValues) {
  // return joinRules(compareMap(field, 'ne', values, normaliseValues), 'and')
  return not(compareIn(field, values, normaliseValues));
}

function isODataFilterBuilder(instance) {
  return instance instanceof ODataFilterBuilder;
}

var ODataFilterBuilder =
/*#__PURE__*/
function () {
  function ODataFilterBuilder(condition) {
    if (condition === void 0) {
      condition = 'and';
    }

    if (!(this instanceof ODataFilterBuilder)) {
      return new ODataFilterBuilder(condition);
    }

    this._condition = condition;
    this._source = {
      condition: condition,
      rules: []
    };
  }
  /**
   * The 'add' method adds new filter rule with AND or OR condition
   * if condition not provided. Source condition is used (AND by default)
   * @this {ODataFilterBuilder}
   * @param {string|ODataFilterBuilder|InputRuleExpression} rule - Rule to add
   * @param {string} [condition] - Condition for rule to add(and/or)
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   * @private
   */


  var _proto = ODataFilterBuilder.prototype;

  _proto._add = function _add(rule, condition) {
    if (condition === void 0) {
      condition = this._condition;
    }

    // NOTE: if condition not provider, source condition uses
    this._source = reduceSourceWithRule(this._source, inputRuleToString(rule), condition);
    return this;
  };
  /*
   * Logical Operators
   */

  /**
   * Logical And
   * @param {string|ODataFilterBuilder|InputRuleExpression} rule - Rule to add
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */


  _proto.and = function and(rule) {
    return this._add(rule, 'and');
  };
  /**
   * Logical Or
   * @param {string|ODataFilterBuilder|InputRuleExpression} rule - Rule to add
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */


  _proto.or = function or(rule) {
    return this._add(rule, 'or');
  };
  /**
   * Logical Negation
   * @param {string|ODataFilterBuilder|InputRuleExpression} rule - Rule to add
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */


  _proto.not = function not$$1(rule) {
    return this._add(not(rule));
  };
  /**
   * Equal
   * @param {string|InputFieldExpression} field - Field to compare
   * @param {string|number|*} value - A value to compare with
   * @param {boolean} [normaliseValue=true] - Convert string "value" to "'value'" or not. (Convert by default)
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */


  _proto.eq = function eq$$1(field, value, normaliseValue) {
    return this._add(eq(field, value, normaliseValue));
  };
  /**
   * Not Equal
   * @param {string|InputFieldExpression} field - Field to compare
   * @param {string|number|*} value - A value to compare with
   * @param {boolean} [normaliseValue=true] - Convert string "value" to "'value'" or not. (Convert by default)
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */


  _proto.ne = function ne$$1(field, value, normaliseValue) {
    return this._add(ne(field, value, normaliseValue));
  };
  /**
   * Greater Than
   * @param {string|InputFieldExpression} field - Field to compare
   * @param {string|number|*} value - A value to compare with
   * @param {boolean} [normaliseValue=true] - Convert string "value" to "'value'" or not. (Convert by default)
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */


  _proto.gt = function gt$$1(field, value, normaliseValue) {
    return this._add(gt(field, value, normaliseValue));
  };
  /**
   * Greater than or Equal
   * @param {string|InputFieldExpression} field - Field to compare
   * @param {string|number|*} value - A value to compare with
   * @param {boolean} [normaliseValue=true] - Convert string "value" to "'value'" or not. (Convert by default)
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */


  _proto.ge = function ge$$1(field, value, normaliseValue) {
    return this._add(ge(field, value, normaliseValue));
  };
  /**
   * Less Than
   * @param {string|InputFieldExpression} field - Field to compare
   * @param {string|number|*} value - A value to compare with
   * @param {boolean} [normaliseValue=true] - Convert string "value" to "'value'" or not. (Convert by default)
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */


  _proto.lt = function lt$$1(field, value, normaliseValue) {
    return this._add(lt(field, value, normaliseValue));
  };
  /**
   * Less than or Equal
   * @param {string|InputFieldExpression} field - Field to compare
   * @param {string|number|*} value - A value to compare with
   * @param {boolean} [normaliseValue=true] - Convert string "value" to "'value'" or not. (Convert by default)
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */


  _proto.le = function le$$1(field, value, normaliseValue) {
    return this._add(le(field, value, normaliseValue));
  };
  /**
   * @param {string|InputFieldExpression} field - Field to compare
   * @param {string[]|string} values - Values to compare with
   * @param {boolean} [normaliseValues=true] - Convert string "value" to "'value'" or not. (Convert by default)
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */


  _proto.in = function _in(field, values, normaliseValues) {
    return this._add(compareIn(field, values, normaliseValues));
  };
  /**
   * @param {string|InputFieldExpression} field - Field to compare
   * @param {Array} values - Values to compare with
   * @param {boolean} [normaliseValues=true] - Convert string "value" to "'value'" or not. (Convert by default)
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */


  _proto.notIn = function notIn(field, values, normaliseValues) {
    return this._add(compareNotIn(field, values, normaliseValues));
  }; // Canonical Functions

  /**
   * The contains function returns true if the second parameter string value is a substring of the first parameter string value.
   * @param {string|InputFieldExpression} field - Field to compare
   * @param {string} value - Value to compare
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */


  _proto.contains = function contains$$1(field, value) {
    return this._add(contains(field, value));
  };
  /**
   * The startswith function returns true if the first parameter string value starts with the second parameter string value.
   * @param {string|InputFieldExpression} field - Field to compare
   * @param {string} value - Value to compare
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */


  _proto.startsWith = function startsWith$$1(field, value) {
    return this._add(startsWith(field, value));
  };
  /**
   * The endswith function returns true if the first parameter string value ends with the second parameter string value.
   * @param {string|InputFieldExpression} field - Field to compare
   * @param {string} value - Value to compare
   * @returns {ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */


  _proto.endsWith = function endsWith$$1(field, value) {
    return this._add(endsWith(field, value));
  };
  /**
   * Custom function
   * @param {string} functionName - Name of generated function
   * @param {string|InputFieldExpression} field - The first function parameter
   * @param {string|number|Array} values - The second function parameter
   * @param {boolean} [normaliseValues=true] - Convert string "value" to "'value'" or not. (Convert by default)
   * @param {boolean} [reverse=false] - Swap field and value params in output. (Don't swap by default)
   * @returns {*|ODataFilterBuilder} The {@link ODataFilterBuilder} instance
   */


  _proto.fn = function fn(functionName, field, values, normaliseValues, reverse) {
    return this._add(canonicalFunction(functionName, field, values, normaliseValues, reverse));
  };

  _proto.isEmpty = function isEmpty() {
    return this._source.rules.length === 0;
  };
  /**
   * Convert filter builder instance to string
   * @this {ODataFilterBuilder}
   * @returns {string} A source string representation
   */


  _proto.toString = function toString() {
    return sourceRuleToString(this._source);
  };

  return ODataFilterBuilder;
}();

ODataFilterBuilder.and = function () {
  return new ODataFilterBuilder('and');
};

ODataFilterBuilder.or = function () {
  return new ODataFilterBuilder('or');
};

ODataFilterBuilder.functions = canonicalFunctions;
ODataFilterBuilder.isODataFilterBuilder = isODataFilterBuilder;

return ODataFilterBuilder;

})));
