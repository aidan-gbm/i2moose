/***************/
/*   MODULES   */
/***************/

// Router
const router = require('express').Router()

/***************/
/*   ROUTING   */
/***************/

// /api/post/*
const postRouter = require('./post')
router.use('/post', postRouter)

// /api/roster/*
const rosterRouter = require('./roster')
router.use('/roster', rosterRouter)

// /api/profile/*
const profileRouter = require('./profile')
router.use('/profile', profileRouter)

module.exports = router