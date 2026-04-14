declare const _default: () => {
    app: {
        nodeEnv: string;
        port: number;
    };
    database: {
        url: string | undefined;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    redis: {
        url: string;
    };
    cors: {
        origins: string[];
    };
};
export default _default;
