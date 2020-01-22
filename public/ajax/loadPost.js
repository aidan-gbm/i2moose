tinymce.init({
  plugins: 'table autoresize',
  selector: '.postDisplay',
  readonly: 1,
  width: '95%',
  toolbar: false,
  menubar: false,
  min_height: 125,
  autoresize_bottom_margin: 0,
  max_height: 800,
  content_style: "body { background: rgb(104, 104, 104); }",
  setup: function(e) { e.on('init', function() {
     this.getContainer().style['border-radius'] = '10px'
     this.getContainer().style['margin-bottom'] = '10px'
  })}
}).then(function() {
  setPost(postId)
})

let postId = 0
function setPost(id) {
  let spinner = `<img src="/images/spinner.gif" style="display:block;margin-left:auto;margin-right:auto;width:5%;">`
  tinymce.activeEditor.setContent(spinner)
  $.getJSON('/api/get-post/' + $(document).attr('title').toLowerCase() + '/' + id).done(function(res) {
    $('img#spinner').hide()
    if (res.postData) {
      $('#postTitle').html(atob(res.postData.title))
      $('#postInfo').html('CDT ' + res.postData.author.toUpperCase() + ' - ' + res.postData.date)
      tinymce.activeEditor.setContent(atob(res.postData.text))
    } else {
      $('#postTitle').html('No posts to display.')
      $('#postInfo').empty()
      tinymce.activeEditor.setContent(`<p style='text-align: center'>Use the staff tools to write your first post.</p>`)
    }
    
    $('img#spinner').hide()

    if (res.next)
      $('button#nextPost').show()
    else
      $('button#nextPost').hide()
    
    if (res.prev)
      $('button#prevPost').show()
    else
      $('button#prevPost').hide()
  })
}