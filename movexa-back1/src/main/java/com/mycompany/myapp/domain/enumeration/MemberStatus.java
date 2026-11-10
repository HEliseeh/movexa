package com.mycompany.myapp.domain.enumeration;

/**
 * Statut de l'adhésion. « Expire bientôt » n'est pas un statut stocké :
 * c'est un ACTIVE dont l'échéance est proche (calculé à l'affichage).
 */
public enum MemberStatus {
    ACTIVE,
    UNPAID,
    EXPIRED,
    FROZEN,
}
