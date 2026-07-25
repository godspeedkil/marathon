// Confirms the caller knows the survey's creator_secret before allowing any
// write. Throws a small { statusCode, message } error object on failure so
// callers can turn it directly into an HTTP response.
export async function verifyCreator(db, surveyId, creatorSecret) {
  if (!surveyId || !creatorSecret) {
    throw { statusCode: 400, message: 'survey_id and creator_secret are required.' }
  }

  const { data, error } = await db
    .from('surveys')
    .select('*')
    .eq('id', surveyId)
    .single()

  if (error || !data) {
    throw { statusCode: 404, message: 'Survey not found.' }
  }

  if (data.creator_secret !== creatorSecret) {
    throw { statusCode: 403, message: 'That edit link is not valid for this survey.' }
  }

  return data
}
