package com.mycompany.myapp.domain;

import com.mycompany.myapp.domain.enumeration.Gender;
import com.mycompany.myapp.domain.enumeration.UserStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.io.Serializable;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "app_user")
public class User implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    private Long id;

    @NotNull
    @Size(max = 100)
    @Column(name = "first_name", length = 100, nullable = false)
    private String firstName;

    @NotNull
    @Size(max = 100)
    @Column(name = "last_name", length = 100, nullable = false)
    private String lastName;

    @Min(0)
    @Max(120)
    @Column(name = "age")
    private Integer age;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "weight")
    private Double weight; // kg

    @Column(name = "height")
    private Double height; // cm

    @Enumerated(EnumType.STRING)
    @Column(name = "sex", length = 20)
    private Gender gender;

    @Size(max = 1000)
    @Column(name = "comment_text", length = 1000)
    private String comment;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private UserStatus status;

    @Email
    @Size(max = 254)
    @Column(name = "email", length = 254, unique = true)
    private String email;

    @Size(max = 20)
    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "date_of_creation", nullable = false, updatable = false)
    private Instant dateOfCreation;

    /** Renseigne automatiquement la date de création au premier enregistrement. */
    @PrePersist
    void onCreate() {
        if (dateOfCreation == null) {
            dateOfCreation = Instant.now();
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User)) return false;
        return id != null && id.equals(((User) o).id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
