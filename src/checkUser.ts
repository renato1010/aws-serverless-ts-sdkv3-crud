import { Auth } from "aws-amplify";

async function checkUser(updateUser: (user: any) => void) {
  const userData = await Auth.currentSession().catch((err) =>
    console.log("error: ", err)
  );
  if (!userData) {
    updateUser({});
    return;
  }
  const { payload } = userData.getIdToken();
  const isAuthorized =
    payload["cognito:groups"] && payload["cognito:groups"].includes("Admin");
  updateUser({
    username: payload["cognito:username"],
    isAuthorized,
  });
}

export default checkUser;
