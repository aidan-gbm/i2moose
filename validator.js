// Input Validation Module

let regex = {
  'alpha': /^[a-zA-Z ]+$/,
  'number': /^[0-9]+$/,
  'length8': /^.{8,}$/,
  'xnumber': /^x[0-9]{5}$/,
  'initial': /^[A-Z]{1}$/,
  'phone': /^[0-9]{3}-[0-9]{3}-[0-9]{4}$/,
  'alphanumeric': /^[a-zA-Z0-9 ]+$/,
  'year': /^[0-9]{4}$/,
}

function noLookup(x) {
  return { 'rows': [] }
}

exports.validateEmail = async function(value, getUserByEmail = noLookup) {
  let messages = []
  let res = await getUserByEmail(value)
  if (res.rows.length > 0) {
    messages.push({'msg':'A user already exists with that email!'})
  }
  return messages
}

exports.validatePassword = function(value1, value2) {
  let messages = []
  if (value1 != value2) {
    messages.push({'msg':'Passwords do not match.'})
  }
  if (!regex['length8'].test(value1)) {
    messages.push({'msg':'Password must contain at least 8 characters.'})
  }
  return messages
}

exports.validateXnumber = async function(value, getProfile = noLookup) {
  let messages = []
  if (!regex['xnumber'].test(value)) {
    messages.push({'msg':'X-Number must be in the format \'x#####\'.'})
  }
  let res = await getProfile(value)
  if (res.rows.length > 0) {
    messages.push({'msg':'A user already exists with that X-Number!'})
  }
  return messages
}

exports.validateAlpha = function(value, item) {
  let messages = []
  if (!regex['alpha'].test(value)) {
    messages.push({'msg':'ITEM can only contain letters.'.replace('ITEM', item)})
  }
  return messages
}

exports.validateNumber = function(value, item) {
  let messages = []
  if (!regex['number'].test(value)) {
    messages.push({'msg':'ITEM can only contain numbers.'.replace('ITEM', item)})
  }
  return messages
}

exports.validateInitial = function(value, item) {
  let messages = []
  if (!regex['initial'].test(value)) {
    messages.push({'msg':'ITEM can only be one letter.'.replace('ITEM', item)})
  }
  return messages
}

exports.validateYear = function(value, item) {
  let messages = []
  if (!regex['year'].test(value)) {
    messages.push({'msg':'ITEM must be a valid year.'.replace('ITEM', item)})
  }
  return messages
}

exports.validateNumber = function(value, item) {
  let messages = []
  if (!regex['number'].test(value)) {
    messages.push({'msg':'ITEM must be a number.'.replace('ITEM', item)})
  }
  return messages
}

exports.validatePhone = function(value) {
  let messages = []
  if (!regex['phone'].test(value)) {
    messages.push({'msg':'Phone number must be in the format: \'###-###-####\''})
  }
  return messages
}

exports.validateAlphanumeric = function(value, item) {
  let messages = []
  if (!regex['alphanumeric'].test(value)) {
    messages.push({'msg':'ITEM must be alphanumeric.'.replace('ITEM', item)})
  }
  return messages
}