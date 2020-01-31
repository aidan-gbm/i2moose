$(document).ready(function() {
  let spinner = `<img src="/images/spinner.gif" style="display:block;margin-left:auto;margin-right:auto;width:5%;">`
  $('button#login').click(function(e) {
    $('#spinner').html(spinner).show()
    $('#success, #error').hide()
    $.ajax({
      type: 'POST',
      url: '/api/profile/login',
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        email: $('#email').val(),
        password: $('#password').val()
      }),
      statusCode: {
        302: function(res) {
          $('#success > #msg').html('Logged In. Redirecting...')
          $('#success').show()
          document.location = res.responseText
        },
        401: function(res) {
          $('#error > #msg').html(res.responseText)
          $('#error').show()
        },
        500: function(res) {
          $('#error > #msg').html(res.responseText)
          $('#error').show()
        }
      }
    }).always(function() {
      $('#spinner').hide()
    })
  })
})
