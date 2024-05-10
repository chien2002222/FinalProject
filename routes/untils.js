const { format } = require('date-fns');

function formatDate(date) {
    return format(new Date(date), 'yyyy-MM-dd');
}

module.exports = { formatDate };
