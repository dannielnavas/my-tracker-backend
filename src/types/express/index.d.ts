import { Users } from '../../users/entities/user.entity';

declare global {
  namespace Express {
    interface Request {
      user?: Users;
    }
  }
}
