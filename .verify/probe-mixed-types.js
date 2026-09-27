// SB-06 measurement — stored BSON type of every `Schema.Types.Mixed` id path.
// A path whose type is uniform is latent; a path with BOTH objectId and string is a live miss.
const specs = [
  ['jobapplications', 'userId'],
  ['jobapplications', 'cvId'],
  ['jobapplications', 'coverLetterId'],
  ['applicationqueues', 'applicationId'],
  ['applicationqueues', 'userId'],
  ['applicationqueues', 'jobId'],
  ['applicationjourneys', 'userId'],
  ['applicationjourneys', 'cvId'],
  ['applicationjourneys', 'coverLetterId'],
  ['applicationevents', 'jobId'],
  ['autoapplyreservations', 'userId'],
  ['autoapplyreservations', 'applicationId'],
  ['autoapplyreservations', 'journeyId'],
  ['autoapplyreservations', 'queueItemId'],
  ['usersettings', 'userId'],
  ['morichats', 'userId'],
  ['morichats', 'cvId'],
  ['companywatchlists', 'userId'],
  ['advocates', 'userId'],
  ['paymentmethods', 'userId'],
  ['invoices', 'userId'],
  ['feedbacks', 'userId'],
  ['verificationtokens', 'userId'],
  ['coverletters', 'userId'],
  ['coverletters', 'jobId'],
  ['coverletters', 'cvId'],
  ['coverletters', 'journeyId'],
  ['communications', 'jobId'],
  ['communications', 'applicationId'],
  ['communications', 'threadId'],
  ['communications', 'companyId'],
  ['communications', 'contactId'],
  ['portalconnections', 'userId'],
  ['portaljobsynctasks', 'userId'],
  ['portaljobsynctasks', 'portalConnectionId'],
];

print('path'.padEnd(42) + 'total  missing  types');
print('-'.repeat(96));

for (const [coll, p] of specs) {
  const c = db.getCollection(coll);
  const total = c.countDocuments({});
  if (total === 0) {
    print((coll + '.' + p).padEnd(42) + '0      -        (collection empty)');
    continue;
  }
  const rows = c
    .aggregate([
      { $match: { [p]: { $exists: true, $ne: null } } },
      { $group: { _id: { $type: '$' + p }, n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ])
    .toArray();
  const missing = c.countDocuments({ [p]: { $exists: false } });
  const types = rows.map((r) => r._id + ':' + r.n).join('  ') || '(none present)';
  print((coll + '.' + p).padEnd(42) + String(total).padEnd(7) + String(missing).padEnd(9) + types);
}
