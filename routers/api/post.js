/***************/
/*   MODULES   */
/***************/

// Router
const router = require('express').Router()

// Database
const modulePostgres = require('../../postgresql')

/***************/
/*   ROUTING   */
/***************/

// /api/post/get/:location/:id
router.get('/get/:location/:id', async function(req, res) {
  let posts = await modulePostgres.getPosts(req.params.location)
  let next, prev = false
  if (posts.rows[0]) {
    if (req.params.id < posts.rows.length - 1)
      next = true
    if (req.params.id > 0)
      prev = true
    res.json({
      'postData': {
        'title': posts.rows[req.params.id].title,
        'author': posts.rows[req.params.id].author,
        'date': posts.rows[req.params.id].date,
        'text': posts.rows[req.params.id].text
      },
      'next': next,
      'prev': prev
    })
  } else {
    res.json({'postData': null, 'next': next, 'prev': prev})
  }
})

module.exports = router