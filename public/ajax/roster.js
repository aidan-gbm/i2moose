function setRoster() {
  $('div#roster').hide()
  $('div#spinner').show()

  let lnk = '/api/roster/get/' + $('select#order').val()
  if ($('input#desc').is(':checked')) lnk = lnk + '/' + 'desc'
  $.getJSON(lnk).done(function(res) {
    $('table#roster').empty()
    if (res.rows.length > 0) {
      // Create header row
      $('table#roster').append('<tr>')
      Object.keys(res.rows[0]).forEach(function(key) {
        $('table#roster').append('<th>' + key + '</th>')
      })
      $('table#roster').append('</tr>')

      // Create body rows
      res.rows.forEach(function(cdt) {
        $('table#roster').append('<tr>')
        Object.keys(cdt).forEach(function(key) {
          $('table#roster').append('<td>' + (cdt[key] || '') + '</td>')
        })
        $('table#roster').append('</tr>')
      })
    } else {
      $('table#roster').append('<tr><td>No Cadets Found</td></tr>')
    }

    $('div#spinner').hide()
    $('div#roster').show()
  })
}

$('select#order').on('change', setRoster)

$(document).ready(setRoster())