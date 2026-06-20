module.exports = {
  ensureAuthenticated: function(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    req.flash('error_msg', 'Please log in to view that resource');
    res.redirect('/login');
  },
  forwardAuthenticated: function(req, res, next) {
    if (!req.isAuthenticated()) {
      return next();
    }
    if (req.user.role === 'admin') {
      res.redirect('/admin/dashboard');
    } else {
      res.redirect('/user/dashboard');
    }
  },
  ensureAdmin: function(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'admin') {
      return next();
    }
    req.flash('error_msg', 'You are not authorized to view that resource');
    res.redirect('/login');
  },
  ensureVolunteer: function(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'volunteer') {
      return next();
    }
    req.flash('error_msg', 'You are not authorized to view that resource');
    res.redirect('/login');
  }
};
