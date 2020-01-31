// Input Validation Module

let regex = {
  'alpha': /^[a-zA-Z ]+$/,
  'number': /^[0-9]+$/,
  'length8': /^.{8,}$/,
  'xnumber': /^x[0-9]{5}$/,
  'initial': /^[A-Z]{0,1}$/,
  'phone': /^[0-9]{3}-[0-9]{3}-[0-9]{4}$/,
  'alphanumeric': /^[a-zA-Z0-9 ]+$/,
  'year': /^[0-9]{4}$/
}

function noLookup(x) {
  return {}
}

exports.validateEmail = function(value, getUserByEmail = noLookup) {
  return getUserByEmail(value)
    .then(function(rows) {
      return (rows.length == 0) ? [] : ['That email is already in use.']
    })
    .catch(function(err) { console.log(err); return ['Internal Server Error.'] })
}

exports.validateXnumber = function(value, getProfile = noLookup) {
  return getProfile(value)
    .then(function(rows) {
      let ret = (rows.length == 0) ? [] : ['That X-Number is already in use.']
      ret.concat(regex['number'].test(value))
      return ret
    })
    .catch(function(err) { console.log(err); return ['Internal Server Error.'] })
}

exports.validatePassword = function(value1, value2) {
  let ret = (value1 == value2) ? [] : ['Passwords do not match.']
  ret.concat(regex['length8'].test(value1) ? 'Password must be at least 8 characters.' : [])
  return ret
}

exports.validateAlpha = function(value, item) {
  return regex['alpha'].test(value) ? [] : [item + ' must only contain letters.']
}

exports.validateInitial = function(value) {
  return regex['initial'].test(value) ? [] : ['Initial should be a single letter.']
}

exports.validateYear = function(value, item) {
  return regex['year'].test(value) ? [] : [item + ' must be a 4-digit year.']
}

exports.validatePhone = function(value) {
  return regex['phone'].test(value) ? [] : ['Phone number must be in the format ###-###-####.']
}

exports.validateAlphanumeric = function(value, item) {
  return regex['alphanumeric'].test(value) ? [] : [item + ' must only contain letters and numbers.']
}