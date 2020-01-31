$(document).ready(function() {
  $.getJSON('/api/profile/get').done(function(res) {
    if (res.rows.length > 0) {
      let user = res.rows[0]
      
      // Public Section
      $('#titleHeader').text(user.firstname + `'s Profile`)
      $('#firstName').val(user.firstname)
      $('#lastName').val(user.lastname)
      $('#middleInitial').val(user.middleinitial || "")
      $('#academicYear').val(user.academicyear || "")
      $('#major').val(user.major || "")

      // Personal Section
      $('#xnumber').val(user.xnumber)
      $('#email').val(user.email)
      $('#phone').val(user.phonenumber || "")
    } else {
      alert(`Your profile doesn't seem to be in the database. Contact your ISO.`)
    }
  })

  let spinner = `<img src="/images/spinner.gif" style="display:block;margin-left:auto;margin-right:auto;width:5%;">`

  $('button#public').click(function(e) {
    $('div#public > #spinner').html(spinner).show()
    $('div#public > #success, #error').hide()
    $.ajax({
      type: 'POST',
      url: '/api/profile/update/public',
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        firstname: $('#firstName').val(),
        lastname: $('#lastName').val(),
        middleinitial: $('#middleInitial').val(),
        academicyear: $('#academicYear').val(),
        major: $('#major').val()
      }),
      statusCode: {
        200: function(res) {
          $('div#public > #success > #msg').html(res)
          $('div#public > #success').show()
        },
        500: function(res) {
          $('div#public > #error > #msg').html(res.responseText)
          $('div#public > #error').show()
        },
        400: function(res) {
          $('div#public > #error > #msg').html(res.responseText)
          $('div#public > #error').show()
        }
      }
    }).always(function() {
      $('div#public > #spinner').hide()
    })
  })

  $('button#personal').click(function(e) {
    $('div#personal > #spinner').html(spinner).show()
    $('div#personal > #success, #error').hide()
    $.ajax({
      type: 'POST',
      url: '/api/profile/update/personal',
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        xnumber: $('#xnumber').val(),
        email: $('#email').val(),
        phonenumber: $('#phone').val()
      }),
      statusCode: {
        200: function(res) {
          $('div#personal > #success > #msg').html(res)
          $('div#personal > #success').show()
        },
        500: function(res) {
          $('div#personal > #error > #msg').html(res.responseText)
          $('div#personal > #error').show()
        },
        400: function(res) {
          $('div#personal > #error > #msg').html(res.responseText)
          $('div#personal > #error').show()
        }
      }
    }).always(function() {
      $('div#personal > #spinner').hide()
    })
  })

  $('button#password').click(function(e) {
    $('div#password > #spinner').html(spinner).show()
    $('div#password > #success, #error').hide()
    $.ajax({
      type: 'POST',
      url: '/api/profile/update/password/',
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        pass1: $('#pass1').val(),
        pass2: $('#pass2').val()
      }),
      statusCode: {
        200: function(res) {
          $('div#password > #success > #msg').html(res)
          $('div#password > #success').show()
        },
        500: function(res) {
          $('div#password > #error > #msg').html(res.responseText)
          $('div#password > #error').show()
        },
        400: function(res) {
          $('div#password > #error > #msg').html(res.responseText)
          $('div#password > #error').show()
        }
      }
    }).always(function() {
      $('div#password > #spinner').hide()
    })
  })
})