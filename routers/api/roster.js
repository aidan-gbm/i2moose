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

// /api/roster/get/:order?/:desc?
router.get('/get/:order?/:desc?', function(req, res) {
  let order = false
  let desc = 'ASC'
  if (req.params.order)
    order = req.params.order
  if (req.params.desc)
    desc = 'DESC'

  let queryPromise = modulePostgres.getRoster(order, desc)
  queryPromise.then(function(rows) {
    res.json({'rows': rows})
  }, function(err) {
    console.log(err)
    res.json({'rows': []})
  })
})

module.exports = router