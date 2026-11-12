package com.mycompany.myapp.security;

/**
 * Constants for Spring Security authorities.
 */
public final class AuthoritiesConstants {

    public static final String ADMIN = "ROLE_ADMIN";

    public static final String USER = "ROLE_USER";

    /** Réceptionniste : inscrit, encaisse, pointe. Le gérant de la salle a ROLE_ADMIN. */
    public static final String RECEPTION = "ROLE_RECEPTION";

    /** Expression @PreAuthorize réservant une action au gérant. */
    public static final String IS_MANAGER = "hasAuthority('ROLE_ADMIN')";

    public static final String ANONYMOUS = "ROLE_ANONYMOUS";

    private AuthoritiesConstants() {}
}
