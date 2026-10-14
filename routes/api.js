'use strict';

// In-memory storage for issues, keyed by project name
const issueDb = {};

// Helper to generate a simple unique ID
function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

module.exports = function (app) {

  app.route('/api/issues/:project')

    .get(function (req, res) {
      let project = req.params.project;

      // Initialize project if not exists
      if (!issueDb[project]) {
        issueDb[project] = [];
      }

      // Apply filters from query string
      let filters = req.query;
      let issues = issueDb[project];

      if (filters && Object.keys(filters).length > 0) {
        issues = issues.filter(issue => {
          return Object.keys(filters).every(key => {
            // Handle boolean conversion for 'open' field
            if (key === 'open') {
              const filterVal = filters[key] === 'true' ? true : false;
              return issue[key] === filterVal;
            }
            return String(issue[key]) === String(filters[key]);
          });
        });
      }

      res.json(issues);
    })

    .post(function (req, res) {
      let project = req.params.project;

      const { issue_title, issue_text, created_by, assigned_to, status_text } = req.body;

      // Validate required fields
      if (!issue_title || !issue_text || !created_by) {
        return res.json({ error: 'required field(s) missing' });
      }

      // Initialize project if not exists
      if (!issueDb[project]) {
        issueDb[project] = [];
      }

      const now = new Date();
      const newIssue = {
        _id: generateId(),
        issue_title,
        issue_text,
        created_by,
        assigned_to: assigned_to || '',
        status_text: status_text || '',
        created_on: now,
        updated_on: now,
        open: true
      };

      issueDb[project].push(newIssue);
      res.json(newIssue);
    })

    .put(function (req, res) {
      let project = req.params.project;

      const { _id, ...updateFields } = req.body;

      // Missing _id
      if (!_id) {
        return res.json({ error: 'missing _id' });
      }

      // Check if there are any update fields
      const fieldsToUpdate = Object.keys(updateFields).filter(
        key => updateFields[key] !== undefined && updateFields[key] !== ''
      );

      if (fieldsToUpdate.length === 0) {
        return res.json({ error: 'no update field(s) sent', '_id': _id });
      }

      // Find the issue
      if (!issueDb[project]) {
        return res.json({ error: 'could not update', '_id': _id });
      }

      const issueIndex = issueDb[project].findIndex(issue => issue._id === _id);

      if (issueIndex === -1) {
        return res.json({ error: 'could not update', '_id': _id });
      }

      // Apply updates
      fieldsToUpdate.forEach(key => {
        if (key === 'open') {
          issueDb[project][issueIndex][key] = updateFields[key] === 'false' ? false : Boolean(updateFields[key]);
        } else {
          issueDb[project][issueIndex][key] = updateFields[key];
        }
      });

      issueDb[project][issueIndex].updated_on = new Date();

      res.json({ result: 'successfully updated', '_id': _id });
    })

    .delete(function (req, res) {
      let project = req.params.project;

      const { _id } = req.body;

      // Missing _id
      if (!_id) {
        return res.json({ error: 'missing _id' });
      }

      if (!issueDb[project]) {
        return res.json({ error: 'could not delete', '_id': _id });
      }

      const issueIndex = issueDb[project].findIndex(issue => issue._id === _id);

      if (issueIndex === -1) {
        return res.json({ error: 'could not delete', '_id': _id });
      }

      issueDb[project].splice(issueIndex, 1);
      res.json({ result: 'successfully deleted', '_id': _id });
    });

};
