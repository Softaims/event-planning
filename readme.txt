You must have installed postgres and node.js 
Change the Database Url in env file according to your postgres username and password
sample url : DATABASE_URL="postgresql://postgres:sherry123@localhost:5432/accounts"
in this username = postgres ::: where it might be different based on your postgres username
in this password = sherry123 ::: where it might be different based on your postgres password

Generate Prisma Client:
npx prisma generate

Create and Run a Migration:
npx prisma migrate dev --name init

Run the seed file for sample data for each type of role:
npm run prisma:seed

You can watch your database enteries using the prisma studio too alternatively you can watch your data on postgresql window app as well:
npx prisma studio
